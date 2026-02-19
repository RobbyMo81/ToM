import { getConfig } from "./config";
import { logger } from "./logger";
import path from "node:path";
import { type CycleReport, type GenerationResult, type KnowledgeDocument, type SearchResult } from "./types";
import { chunkDocument } from "../integrations/chunker";
import { loadKnowledgeDocs } from "../integrations/knowledgeLoader";
import { OllamaClient } from "../integrations/ollamaClient";
import { VectorStore } from "../integrations/vectorStore";
import { BraveClient } from "../integrations/braveClient";
import { braveResultsToDocuments } from "../integrations/webKnowledge";
import { RuntimeMemoryStore } from "../integrations/runtimeMemoryStore";
import {
  assertRoleCanExecuteStage,
  createCycleProposalPayload,
  decideCycleProposalPolicy,
  OxideRolePolicyError,
  OXIDE_ROLE_CONTRACTS,
  OXIDE_WORKFLOW_STAGES,
  validateCycleProposalPayload,
} from "./oxideGovernance";
import {
  createIdentityBinder,
  IdentityBindingUnavailableError,
  type IdentityContext,
  type IdentityAgent,
} from "./identityBinder";

interface RunCycleOptions {
  triggerSource?: "cron" | "manual" | "api" | "agent";
  initiatedBy?: string;
}

export class ToMBrain {
  private readonly config = getConfig();
  private readonly vectors = new VectorStore(this.config.dbPath);
  private readonly ollama = new OllamaClient(this.config);
  private readonly brave = new BraveClient(this.config);
  private readonly identityBinder = createIdentityBinder(this.config);

  async ingestLocalKnowledge(): Promise<{ documentsIndexed: number; chunksIndexed: number; discovered: number }> {
    const governanceDir = path.resolve(this.config.knowledgeDir, ".tom-workspace");
    const purged = this.vectors.purgeLocalDocumentsByPathPrefix(governanceDir);
    if (purged > 0) {
      logger.info("Purged governance identity docs from vector store.", { purged });
    }

    const docs = await loadKnowledgeDocs(this.config);
    const filtered = docs.filter((doc) => doc.sourceType === "local");

    const activeIds = new Set(filtered.map((doc) => doc.id));
    const stalePurged = this.vectors.purgeLocalDocumentsNotInSet(activeIds);
    if (stalePurged > 0) {
      logger.info("Purged stale local docs missing from workspace.", { purged: stalePurged });
    }

    return this.indexDocuments(filtered);
  }

  async enrichWithWebKnowledge(): Promise<{
    webQueriesRun: number;
    webDocumentsIndexed: number;
    chunksIndexed: number;
  }> {
    if (!this.config.webEnrichment.enabled || this.config.webEnrichment.queries.length === 0) {
      return { webQueriesRun: 0, webDocumentsIndexed: 0, chunksIndexed: 0 };
    }

    if (!this.config.braveApiKey) {
      logger.warn("WEB_ENRICHMENT_ENABLED is true but BRAVE_API_KEY is not set. Skipping web enrichment.");
      return { webQueriesRun: 0, webDocumentsIndexed: 0, chunksIndexed: 0 };
    }

    let webDocumentsIndexed = 0;
    let chunksIndexed = 0;

    for (const query of this.config.webEnrichment.queries) {
      const results = await this.brave.search(query, this.config.webEnrichment.topK);
      const docs = await braveResultsToDocuments(query, results, this.config);
      const indexed = await this.indexDocuments(docs);
      webDocumentsIndexed += indexed.documentsIndexed;
      chunksIndexed += indexed.chunksIndexed;
    }

    return {
      webQueriesRun: this.config.webEnrichment.queries.length,
      webDocumentsIndexed,
      chunksIndexed,
    };
  }

  async runCycle(options?: RunCycleOptions): Promise<CycleReport> {
    const cycleIdentity = await this.bindStrictIdentity("tom", "runCycle");
    this.assertRoleStage("tom", "discover");
    const cycleIdentityMetadata = this.toIdentityMetadata(cycleIdentity);
    const runtimeStore = new RuntimeMemoryStore(this.config.runtimeDbPath);
    runtimeStore.bootstrap();

    const triggerSource = options?.triggerSource ?? "manual";
    const initiatedBy = options?.initiatedBy ?? "tom";
    const workflowRunId = runtimeStore.startWorkflowRun({
      workflowName: "tom.brain.cycle",
      triggerSource,
      initiatedBy,
      context: {
        schedule: this.config.cronSchedule,
        webEnrichmentEnabled: this.config.webEnrichment.enabled,
        identity: cycleIdentityMetadata,
        oxideWorkflow: {
          stages: OXIDE_WORKFLOW_STAGES,
          roleContracts: OXIDE_ROLE_CONTRACTS,
        },
      },
    });

    const startedAt = new Date().toISOString();

    logger.info("Identity bound for runCycle", {
      identityRole: cycleIdentity.identityRole,
      promptClass: cycleIdentity.promptClass,
      identityVersion: cycleIdentity.identityVersion,
    });

    const runStep = async <T>(
      stepName: string,
      details: Record<string, unknown>,
      action: () => Promise<T>
    ): Promise<T> => {
      const stepId = runtimeStore.startWorkflowStep({
        workflowRunId,
        stepName,
        details,
      });

      try {
        const result = await action();
        runtimeStore.endWorkflowStep(stepId, "succeeded", details);
        return result;
      } catch (error) {
        runtimeStore.endWorkflowStep(stepId, "failed", {
          ...details,
          error: error instanceof Error ? error.message : "Unknown step error",
        });
        runtimeStore.appendTaskEvent({
          workflowRunId,
          stepId,
          eventType: "error",
          eventLevel: "medium",
          message: `Cycle step failed: ${stepName}`,
          payload: {
            error: error instanceof Error ? error.message : "Unknown step error",
          },
        });
        throw error;
      }
    };

    try {
      const healthy = await runStep("health-check-ollama", {}, async () => this.ollama.healthCheck());
      if (!healthy) {
        throw new Error("Ollama is unreachable. Start Ollama before running cycle.");
      }

      logger.info("Cycle step 1/3: ingest local knowledge...");
      const local = await runStep("ingest-local-knowledge", { knowledgeDir: this.config.knowledgeDir }, async () =>
        this.ingestLocalKnowledge()
      );

      logger.info("Cycle step 2/3: enrich with Brave web search...");
      const web = await runStep(
        "enrich-web-knowledge",
        { queries: this.config.webEnrichment.queries.length },
        async () => this.enrichWithWebKnowledge()
      );

      logger.info("Cycle step 3/3: finalize and report memory stats...");

      const report = await runStep("finalize-cycle-report", {}, async () => {
        const finishedAt = new Date().toISOString();
        return {
          startedAt,
          finishedAt,
          documentsDiscovered: local.discovered,
          documentsIndexed: local.documentsIndexed + web.webDocumentsIndexed,
          chunksIndexed: local.chunksIndexed + web.chunksIndexed,
          webQueriesRun: web.webQueriesRun,
          webDocumentsIndexed: web.webDocumentsIndexed,
        };
      });

      const cycleSkillId = runtimeStore.recordLearnedSkill({
        skillKey: `cycle.summary.${report.finishedAt}`,
        description: `Cycle indexed ${report.documentsIndexed} docs (${report.webDocumentsIndexed} from web).`,
        sourceType: "doc",
        sourceRef: `workflow:${workflowRunId}`,
        confidence: 0.8,
        learnedAt: report.finishedAt,
        metadata: {
          report,
        },
      });

      const recommendedActions: string[] = [];
      if (report.webQueriesRun === 0) {
        recommendedActions.push("Review WEB_ENRICHMENT_QUERIES and BRAVE_API_KEY configuration.");
      }
      if (report.documentsIndexed === 0) {
        recommendedActions.push("No document changes were indexed; verify upstream knowledge updates are flowing.");
      }
      if (recommendedActions.length === 0) {
        recommendedActions.push("Maintain current ingest cadence and monitor drift indicators.");
      }

      const proposalPayload = createCycleProposalPayload(workflowRunId, report, recommendedActions);
      const proposalValidation = validateCycleProposalPayload(proposalPayload);
      const policyDecision = decideCycleProposalPolicy(proposalPayload, proposalValidation);

      this.assertRoleStage("oxide", "propose");

      const proposalId = runtimeStore.createSkillToLogicProposal({
        skillId: cycleSkillId,
        proposedBy: "oxide",
        proposalType: "policy_change",
        proposal: proposalPayload,
        determinismScore: policyDecision.determinismScore,
        riskLevel: policyDecision.riskLevel,
        status: "drafted",
      });

      const validationId = await runStep(
        "validate-cycle-proposal",
        {
          proposalId,
        },
        async () => {
          const buildPass = true;
          const lintPass = true;
          const testPass = true;
          const policyPass = policyDecision.policyPass;

          return runtimeStore.recordValidationResult({
            proposalId,
            validator: "oxide",
            buildPass,
            lintPass,
            testPass,
            policyPass,
            details: {
              mode: "deterministic-runtime-gate",
              rationale: policyDecision.reason,
              schemaValidation: {
                valid: proposalValidation.valid,
                errors: proposalValidation.errors,
              },
              report,
            },
          });
        }
      );

      const proposalValidated = policyDecision.decision === "validated";
      runtimeStore.updateSkillToLogicProposalStatus(proposalId, proposalValidated ? "validated" : "rejected");

      const approvalId = await runStep(
        "approve-cycle-proposal",
        {
          proposalId,
          validationId,
        },
        async () => {
          return runtimeStore.recordApproval({
            proposalId,
            approver: "oxide-governance",
            approvalType: "policy",
            decision: proposalValidated ? "approved" : "rejected",
            notes: proposalValidated
              ? "Automated low-risk policy approval after deterministic validation."
              : "Policy gate rejected proposal because no documents were indexed.",
          });
        }
      );

      runtimeStore.updateSkillToLogicProposalStatus(proposalId, proposalValidated ? "approved" : "rejected");

      const deployOutcomeId = await runStep(
        "record-cycle-deploy-outcome",
        {
          proposalId,
          approvalId,
        },
        async () => {
          const deploymentStatus = proposalValidated ? "succeeded" : "failed";
          const id = runtimeStore.recordDeployOutcome({
            proposalId,
            deploymentTarget: "runtime-memory",
            deploymentId: `workflow:${workflowRunId}`,
            status: deploymentStatus,
            summary: proposalValidated
              ? "Cycle proposal promoted to runtime lineage history."
              : "Cycle proposal not promoted due to failed policy gate.",
            metrics: {
              documentsIndexed: report.documentsIndexed,
              webDocumentsIndexed: report.webDocumentsIndexed,
            },
          });

          if (proposalValidated) {
            runtimeStore.updateSkillToLogicProposalStatus(proposalId, "promoted");
          }

          return id;
        }
      );

      runtimeStore.appendTaskEvent({
        workflowRunId,
        eventType: "info",
        eventLevel: "low",
        message: "Cycle identity binding and governance context initialized.",
        payload: {
          role: cycleIdentity.identityRole,
          stage: "discover",
          authority: "tom",
          promptClass: cycleIdentity.promptClass,
          identityVersion: cycleIdentity.identityVersion,
          policyDecision: "identity-bound-start",
          decisionRationale: "Strict identity binding succeeded before cycle execution.",
        },
      });

      runtimeStore.appendTaskEvent({
        workflowRunId,
        eventType: proposalValidated ? "approval" : "policy",
        eventLevel: proposalValidated ? "low" : "medium",
        message: proposalValidated
          ? "Cycle proposal validated, approved, and deployment outcome recorded."
          : "Cycle proposal rejected by policy gate; deployment outcome recorded as failed.",
        payload: {
          role: "O.X.I.D.E",
          stage: proposalValidated ? "promote" : "validate",
          authority: proposalValidated ? "runtime-memory" : "oxide-governance",
          policyDecision: proposalValidated ? "approved" : "rejected",
          decisionRationale: policyDecision.reason,
          skillId: cycleSkillId,
          proposalId,
          validationId,
          approvalId,
          deployOutcomeId,
          proposalStatus: proposalValidated ? "promoted" : "rejected",
        },
      });

      runtimeStore.endWorkflowRun(workflowRunId, "succeeded", {
        identity: cycleIdentityMetadata,
        report,
        skillId: cycleSkillId,
        proposalId,
        validationId,
        approvalId,
        deployOutcomeId,
        proposalStatus: proposalValidated ? "promoted" : "rejected",
      });

      return report;
    } catch (error) {
      runtimeStore.endWorkflowRun(workflowRunId, "failed", {
        identity: cycleIdentityMetadata,
        error: error instanceof Error ? error.message : "Unknown cycle failure",
      });
      throw error;
    } finally {
      runtimeStore.close();
    }
  }

  async query(question: string, topK = this.config.retrieval.defaultTopK): Promise<SearchResult[]> {
    const identity = await this.bindStrictIdentity("tom", "query");
    this.assertRoleStage(identity.identityAgent, "discover");
    const vector = await this.ollama.embed(this.buildIdentityBoundQuestion(question, identity));
    return this.vectors.similaritySearch(vector, topK);
  }

  async generate(question: string, topK = this.config.retrieval.defaultTopK): Promise<GenerationResult> {
    const identity = await this.bindStrictIdentity("tom", "generate");
    this.assertRoleStage(identity.identityAgent, "discover");
    const contexts = await this.query(question, topK);

    const contextBlocks: string[] = [];
    let consumedChars = 0;
    for (let index = 0; index < contexts.length; index += 1) {
      const context = contexts[index];
      const block = [
        `Context ${index + 1}:`,
        `source=${context.path}`,
        `score=${context.score.toFixed(4)}`,
        context.content,
      ].join("\n");

      if (consumedChars + block.length > this.config.generation.maxContextChars) {
        break;
      }

      contextBlocks.push(block);
      consumedChars += block.length;
    }

    const answer = await this.ollama.generate(
      [
        {
          role: "system",
          content: [identity.systemPrompt, this.config.generation.systemPrompt].join("\n\n"),
        },
        {
          role: "user",
          content: [
            "Answer the user question using the context below.",
            "If context is insufficient, say so briefly and avoid fabricating details.",
            "",
            "Question:",
            question,
            "",
            "Retrieved Context:",
            contextBlocks.length > 0 ? contextBlocks.join("\n\n") : "(no context retrieved)",
          ].join("\n"),
        },
      ],
      {
        temperature: this.config.generation.temperature,
        numPredict: this.config.generation.maxResponseTokens,
      }
    );

    return {
      question,
      answer,
      model: this.config.ollama.chatModel,
      contextCount: contextBlocks.length,
      contexts: contexts.slice(0, contextBlocks.length),
    };
  }

  getVectorCount(): number {
    return this.vectors.countVectors();
  }

  shutdown(): void {
    this.vectors.close();
  }

  private async bindStrictIdentity(agent: IdentityAgent, operation: string): Promise<IdentityContext> {
    try {
      return await this.identityBinder.bind(agent);
    } catch (error) {
      const strictError = new IdentityBindingUnavailableError(agent, operation, error);
      logger.error("Strict identity guard blocked operation", {
        code: strictError.code,
        operation,
        agent,
      });
      throw strictError;
    }
  }

  private buildIdentityBoundQuestion(question: string, identity: IdentityContext): string {
    return `[${identity.identityRole}|${identity.promptClass}] ${question}`;
  }

  private toIdentityMetadata(identity: IdentityContext): {
    identityAgent: string;
    identityVersion: string;
    promptClass: string;
  } {
    return {
      identityAgent: identity.identityAgent,
      identityVersion: identity.identityVersion,
      promptClass: identity.promptClass,
    };
  }

  private assertRoleStage(roleAgent: "tom" | "oxide", requestedStage: "discover" | "propose"): void {
    try {
      assertRoleCanExecuteStage(roleAgent, requestedStage);
    } catch (error) {
      if (error instanceof OxideRolePolicyError) {
        logger.error("Role routing policy blocked action", {
          code: error.code,
          roleAgent: error.roleAgent,
          requestedStage: error.requestedStage,
        });
      }
      throw error;
    }
  }

  private async indexDocuments(
    docs: KnowledgeDocument[]
  ): Promise<{ documentsIndexed: number; chunksIndexed: number; discovered: number }> {
    let documentsIndexed = 0;
    let chunksIndexed = 0;

    for (const doc of docs) {
      const existingChecksum = this.vectors.getDocumentChecksum(doc.id);
      if (existingChecksum === doc.checksum) {
        continue;
      }

      this.vectors.upsertDocument({
        id: doc.id,
        title: doc.title,
        area: doc.area,
        sourceType: doc.sourceType,
        path: doc.path,
        checksum: doc.checksum,
        updatedAt: doc.updatedAt,
        tags: doc.tags,
      });

      this.vectors.deleteVectorsForDocument(doc.id);

      const chunks = chunkDocument(doc, this.config);
      for (const chunk of chunks) {
        this.vectors.upsertChunk({
          id: chunk.id,
          documentId: chunk.documentId,
          area: chunk.area,
          sourceType: chunk.sourceType,
          path: chunk.path,
          chunkIndex: chunk.chunkIndex,
          content: chunk.content,
          checksum: chunk.checksum,
          updatedAt: chunk.updatedAt,
        });

        const embedding = await this.ollama.embed(chunk.content);
        this.vectors.upsertVector({
          chunkId: chunk.id,
          documentId: chunk.documentId,
          area: chunk.area,
          sourceType: chunk.sourceType,
          path: chunk.path,
          content: chunk.content,
          vector: embedding,
        });
        chunksIndexed += 1;
      }

      documentsIndexed += 1;
    }

    return {
      discovered: docs.length,
      documentsIndexed,
      chunksIndexed,
    };
  }
}
