import { ToMBrain } from "./core/brain";
import { logger } from "./core/logger";
import { getConfig } from "./core/config";
import { syncGitHubReport } from "./integrations/githubReportSync";
import { syncWhoiamDocument } from "./integrations/whoiamSync";
import { RuntimeMemoryStore } from "./integrations/runtimeMemoryStore";
import { readFile } from "node:fs/promises";
import { OverrideRevocationStore } from "./core/governance/overrideRevocation";

function parseOption(args: string[], name: string): string | undefined {
  const optionIndex = args.findIndex((value) => value === name);
  if (optionIndex < 0) {
    return undefined;
  }
  return args[optionIndex + 1];
}

async function loadOverrideTokenFromArgs(args: string[]): Promise<unknown | undefined> {
  const tokenIndex = args.findIndex((value) => value === "--override-token");
  if (tokenIndex < 0) {
    return undefined;
  }

  const filePath = args[tokenIndex + 1];
  if (!filePath) {
    throw new Error("Missing value for --override-token. Example: npm run cycle -- --override-token .tom-workspace/authorizations/override/token.json");
  }

  const content = await readFile(filePath, "utf8");
  return JSON.parse(content);
}

async function run(): Promise<void> {
  const [, , command, ...rest] = process.argv;
  const brain = new ToMBrain();
  const config = getConfig();

  try {
    if (command === "ingest") {
      const local = await brain.ingestLocalKnowledge();
      logger.info("Local ingestion complete", local);
      return;
    }

    if (command === "query") {
      const question = rest.join(" ").trim();
      if (!question) {
        throw new Error('Provide a query string. Example: npm run query -- "what did I learn about ssh hardening?"');
      }

      const runtimeStore = new RuntimeMemoryStore(config.runtimeDbPath);
      runtimeStore.bootstrap();
      const sessionId = runtimeStore.startSession({
        actor: "cli",
        channel: "query",
        metadata: {
          command,
          topK: config.retrieval.defaultTopK,
        },
      });

      try {
        runtimeStore.appendConversationTurn({
          sessionId,
          role: "user",
          content: question,
        });

        const results = await brain.query(question);
        logger.info(`Query results for: ${question}`);
        for (const result of results) {
          console.log("---");
          console.log(`score=${result.score.toFixed(4)} area=${result.area} source=${result.sourceType}`);
          console.log(`path=${result.path}`);
          console.log(result.content.slice(0, 500));
        }

        const summary = [
          `Query returned ${results.length} result(s).`,
          ...results
            .slice(0, 5)
            .map((result, index) => `${index + 1}. ${result.path} (score=${result.score.toFixed(4)})`),
        ].join("\n");

        runtimeStore.appendConversationTurn({
          sessionId,
          role: "assistant",
          content: summary,
          metadata: {
            resultCount: results.length,
            topPaths: results.slice(0, 10).map((result) => result.path),
          },
        });
        runtimeStore.endSession(sessionId, "completed");
      } catch (error) {
        runtimeStore.appendConversationTurn({
          sessionId,
          role: "assistant",
          content: error instanceof Error ? error.message : "Unknown query error",
          metadata: { error: true },
        });
        runtimeStore.endSession(sessionId, "failed");
        throw error;
      } finally {
        runtimeStore.close();
      }

      return;
    }

    if (command === "generate") {
      const question = rest.join(" ").trim();
      if (!question) {
        throw new Error(
          'Provide a query string. Example: npm run generate -- "summarize what I learned about ssh hardening"'
        );
      }

      const runtimeStore = new RuntimeMemoryStore(config.runtimeDbPath);
      runtimeStore.bootstrap();
      const sessionId = runtimeStore.startSession({
        actor: "cli",
        channel: "generate",
        metadata: {
          command,
          topK: config.retrieval.defaultTopK,
          model: config.ollama.chatModel,
        },
      });

      try {
        runtimeStore.appendConversationTurn({
          sessionId,
          role: "user",
          content: question,
        });

        const result = await brain.generate(question);
        logger.info(`Generated answer for: ${question}`);
        console.log(result.answer);

        runtimeStore.appendConversationTurn({
          sessionId,
          role: "assistant",
          content: result.answer,
          metadata: {
            model: result.model,
            contextCount: result.contextCount,
            topPaths: result.contexts.map((context) => context.path),
          },
        });
        runtimeStore.endSession(sessionId, "completed");
      } catch (error) {
        runtimeStore.appendConversationTurn({
          sessionId,
          role: "assistant",
          content: error instanceof Error ? error.message : "Unknown generation error",
          metadata: { error: true },
        });
        runtimeStore.endSession(sessionId, "failed");
        throw error;
      } finally {
        runtimeStore.close();
      }

      return;
    }

    if (command === "cycle") {
      const hitlOverrideToken = await loadOverrideTokenFromArgs(rest);
      const report = await brain.runCycle({
        triggerSource: "manual",
        initiatedBy: "cli",
        hitlOverrideToken,
      });
      logger.info("Cycle report", report);
      return;
    }

    if (command === "revoke") {
      const overrideId = parseOption(rest, "--override");
      if (!overrideId || overrideId.trim().length === 0) {
        throw new Error("Missing --override value. Example: npm run revoke -- --override <override_id> [--by <actor>] [--reason <text>]");
      }

      const revokedBy = parseOption(rest, "--by") ?? "cli-operator";
      const reason = parseOption(rest, "--reason") ?? "Operator initiated revocation";

      const revocationStore = new OverrideRevocationStore();
      const record = revocationStore.revoke(overrideId.trim(), revokedBy.trim(), reason.trim());
      logger.info("Override revoked", record);
      return;
    }

    if (command === "github-sync") {
      const syncReport = await syncGitHubReport(config);
      logger.info("GitHub sync report", syncReport);

      if (config.githubSync.reindexAfterSync) {
        const ingest = await brain.ingestLocalKnowledge();
        logger.info("GitHub sync reindex report", ingest);
      }
      return;
    }

    if (command === "whoiam-sync") {
      const report = await syncWhoiamDocument(config);
      logger.info("WhoAmI sync report", report);
      return;
    }

    console.log("Usage:");
    console.log("  npm run ingest");
    console.log('  npm run query -- "<question>"');
    console.log('  npm run generate -- "<question>"');
    console.log("  npm run cycle [-- --override-token <path-to-json>]");
    console.log("  npm run revoke -- --override <override_id> [--by <actor>] [--reason <text>]");
    console.log("  npm run github:sync");
    console.log("  npm run whoiam:sync");
  } finally {
    brain.shutdown();
  }
}

run().catch((error) => {
  logger.error("CLI failed", error);
  process.exitCode = 1;
});
