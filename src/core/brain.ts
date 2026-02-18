import { getConfig } from "./config";
import { logger } from "./logger";
import { CycleReport, KnowledgeDocument, SearchResult } from "./types";
import { chunkDocument } from "../integrations/chunker";
import { loadKnowledgeDocs } from "../integrations/knowledgeLoader";
import { OllamaClient } from "../integrations/ollamaClient";
import { VectorStore } from "../integrations/vectorStore";
import { BraveClient } from "../integrations/braveClient";
import { braveResultsToDocuments } from "../integrations/webKnowledge";

export class ToMBrain {
  private readonly config = getConfig();
  private readonly vectors = new VectorStore(this.config.dbPath);
  private readonly ollama = new OllamaClient(this.config);
  private readonly brave = new BraveClient(this.config);

  async ingestLocalKnowledge(): Promise<{ documentsIndexed: number; chunksIndexed: number; discovered: number }> {
    const docs = await loadKnowledgeDocs(this.config);
    const filtered = docs.filter((doc) => doc.sourceType === "local");
    return this.indexDocuments(filtered);
  }

  async enrichWithWebKnowledge(): Promise<{ webQueriesRun: number; webDocumentsIndexed: number; chunksIndexed: number }> {
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

  async runCycle(): Promise<CycleReport> {
    const startedAt = new Date().toISOString();

    const healthy = await this.ollama.healthCheck();
    if (!healthy) {
      throw new Error("Ollama is unreachable. Start Ollama before running cycle.");
    }

    logger.info("Cycle step 1/3: ingest local knowledge...");
    const local = await this.ingestLocalKnowledge();

    logger.info("Cycle step 2/3: enrich with Brave web search...");
    const web = await this.enrichWithWebKnowledge();

    logger.info("Cycle step 3/3: finalize and report memory stats...");

    return {
      startedAt,
      finishedAt: new Date().toISOString(),
      documentsDiscovered: local.discovered,
      documentsIndexed: local.documentsIndexed + web.webDocumentsIndexed,
      chunksIndexed: local.chunksIndexed + web.chunksIndexed,
      webQueriesRun: web.webQueriesRun,
      webDocumentsIndexed: web.webDocumentsIndexed,
    };
  }

  async query(question: string, topK = this.config.retrieval.defaultTopK): Promise<SearchResult[]> {
    const vector = await this.ollama.embed(question);
    return this.vectors.similaritySearch(vector, topK);
  }

  getVectorCount(): number {
    return this.vectors.countVectors();
  }

  shutdown(): void {
    this.vectors.close();
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
