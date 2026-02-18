import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { type SearchResult } from "../core/types";

interface VectorRow {
  chunk_id: string;
  document_id: string;
  area: string;
  source_type: string;
  path: string;
  content: string;
  vector_json: string;
}

export class VectorStore {
  private db: Database.Database;

  constructor(dbPath: string) {
    mkdirSync(path.dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    this.bootstrap();
  }

  private bootstrap(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        area TEXT NOT NULL,
        source_type TEXT NOT NULL,
        path TEXT NOT NULL,
        checksum TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        tags_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS chunks (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        area TEXT NOT NULL,
        source_type TEXT NOT NULL,
        path TEXT NOT NULL,
        chunk_index INTEGER NOT NULL,
        content TEXT NOT NULL,
        checksum TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(document_id) REFERENCES documents(id)
      );

      CREATE TABLE IF NOT EXISTS vectors (
        chunk_id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        area TEXT NOT NULL,
        source_type TEXT NOT NULL,
        path TEXT NOT NULL,
        content TEXT NOT NULL,
        vector_json TEXT NOT NULL,
        FOREIGN KEY(chunk_id) REFERENCES chunks(id)
      );

      CREATE INDEX IF NOT EXISTS idx_documents_checksum ON documents(checksum);
      CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON chunks(document_id);
      CREATE INDEX IF NOT EXISTS idx_vectors_document_id ON vectors(document_id);
    `);
  }

  upsertDocument(input: {
    id: string;
    title: string;
    area: string;
    sourceType: string;
    path: string;
    checksum: string;
    updatedAt: string;
    tags: string[];
  }): void {
    const stmt = this.db.prepare(`
      INSERT INTO documents (id, title, area, source_type, path, checksum, updated_at, tags_json)
      VALUES (@id, @title, @area, @sourceType, @path, @checksum, @updatedAt, @tagsJson)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        area = excluded.area,
        source_type = excluded.source_type,
        path = excluded.path,
        checksum = excluded.checksum,
        updated_at = excluded.updated_at,
        tags_json = excluded.tags_json
    `);
    stmt.run({
      ...input,
      tagsJson: JSON.stringify(input.tags),
    });
  }

  upsertChunk(input: {
    id: string;
    documentId: string;
    area: string;
    sourceType: string;
    path: string;
    chunkIndex: number;
    content: string;
    checksum: string;
    updatedAt: string;
  }): void {
    const stmt = this.db.prepare(`
      INSERT INTO chunks (id, document_id, area, source_type, path, chunk_index, content, checksum, updated_at)
      VALUES (@id, @documentId, @area, @sourceType, @path, @chunkIndex, @content, @checksum, @updatedAt)
      ON CONFLICT(id) DO UPDATE SET
        document_id = excluded.document_id,
        area = excluded.area,
        source_type = excluded.source_type,
        path = excluded.path,
        chunk_index = excluded.chunk_index,
        content = excluded.content,
        checksum = excluded.checksum,
        updated_at = excluded.updated_at
    `);
    stmt.run(input);
  }

  upsertVector(input: {
    chunkId: string;
    documentId: string;
    area: string;
    sourceType: string;
    path: string;
    content: string;
    vector: number[];
  }): void {
    const stmt = this.db.prepare(`
      INSERT INTO vectors (chunk_id, document_id, area, source_type, path, content, vector_json)
      VALUES (@chunkId, @documentId, @area, @sourceType, @path, @content, @vectorJson)
      ON CONFLICT(chunk_id) DO UPDATE SET
        document_id = excluded.document_id,
        area = excluded.area,
        source_type = excluded.source_type,
        path = excluded.path,
        content = excluded.content,
        vector_json = excluded.vector_json
    `);
    stmt.run({
      ...input,
      vectorJson: JSON.stringify(input.vector),
    });
  }

  getDocumentChecksum(documentId: string): string | undefined {
    const row = this.db.prepare("SELECT checksum FROM documents WHERE id = ?").get(documentId) as
      | { checksum?: string }
      | undefined;
    return row?.checksum;
  }

  deleteVectorsForDocument(documentId: string): void {
    this.db.prepare("DELETE FROM vectors WHERE document_id = ?").run(documentId);
    this.db.prepare("DELETE FROM chunks WHERE document_id = ?").run(documentId);
  }

  purgeLocalDocumentsByPathPrefix(pathPrefix: string): number {
    const rows = this.db
      .prepare("SELECT id FROM documents WHERE source_type = 'local' AND path LIKE ?")
      .all(`${pathPrefix}%`) as Array<{ id: string }>;

    for (const row of rows) {
      this.deleteVectorsForDocument(row.id);
      this.db.prepare("DELETE FROM documents WHERE id = ?").run(row.id);
    }

    return rows.length;
  }

  purgeLocalDocumentsNotInSet(activeDocumentIds: Set<string>): number {
    const rows = this.db.prepare("SELECT id FROM documents WHERE source_type = 'local'").all() as Array<{ id: string }>;

    let purged = 0;
    for (const row of rows) {
      if (activeDocumentIds.has(row.id)) {
        continue;
      }

      this.deleteVectorsForDocument(row.id);
      this.db.prepare("DELETE FROM documents WHERE id = ?").run(row.id);
      purged += 1;
    }

    return purged;
  }

  countVectors(): number {
    const row = this.db.prepare("SELECT COUNT(*) as c FROM vectors").get() as { c: number };
    return row.c;
  }

  similaritySearch(queryVector: number[], topK: number): SearchResult[] {
    const rows = this.db
      .prepare("SELECT chunk_id, document_id, area, source_type, path, content, vector_json FROM vectors")
      .all() as VectorRow[];

    const scored = rows
      .map((row) => {
        const vec = JSON.parse(row.vector_json) as number[];
        return {
          chunkId: row.chunk_id,
          documentId: row.document_id,
          score: cosineSimilarity(queryVector, vec),
          content: row.content,
          area: row.area as SearchResult["area"],
          sourceType: row.source_type as SearchResult["sourceType"],
          path: row.path,
        };
      })
      .filter((result) => Number.isFinite(result.score))
      .sort((left, right) => right.score - left.score)
      .slice(0, topK);

    return scored;
  }

  close(): void {
    this.db.close();
  }
}

function cosineSimilarity(left: number[], right: number[]): number {
  if (left.length === 0 || right.length === 0 || left.length !== right.length) {
    return Number.NEGATIVE_INFINITY;
  }

  let dot = 0;
  let normLeft = 0;
  let normRight = 0;

  for (let index = 0; index < left.length; index += 1) {
    const a = left[index];
    const b = right[index];
    dot += a * b;
    normLeft += a * a;
    normRight += b * b;
  }

  if (normLeft === 0 || normRight === 0) {
    return Number.NEGATIVE_INFINITY;
  }

  return dot / (Math.sqrt(normLeft) * Math.sqrt(normRight));
}
