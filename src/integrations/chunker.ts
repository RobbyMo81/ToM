import { type AppConfig } from "../core/config";
import { sha256 } from "../core/hash";
import { type KnowledgeChunk, type KnowledgeDocument } from "../core/types";

function normalizeWhitespace(input: string): string {
  return input.replace(/\r\n/g, "\n").trim();
}

export function chunkDocument(doc: KnowledgeDocument, config: AppConfig): KnowledgeChunk[] {
  const normalized = normalizeWhitespace(doc.content);
  if (!normalized) {
    return [];
  }

  const maxChars = config.chunking.maxChars;
  const overlap = Math.min(config.chunking.overlapChars, Math.floor(maxChars / 2));

  const chunks: KnowledgeChunk[] = [];
  let start = 0;
  let chunkIndex = 0;

  while (start < normalized.length) {
    const end = Math.min(normalized.length, start + maxChars);
    const rawSlice = normalized.slice(start, end);

    let boundary = rawSlice.lastIndexOf("\n\n");
    if (boundary < maxChars * 0.5) {
      boundary = rawSlice.lastIndexOf(". ");
    }
    if (boundary < maxChars * 0.5) {
      boundary = rawSlice.length;
    }

    const finalSlice = rawSlice.slice(0, boundary).trim();
    if (finalSlice.length > 0) {
      const id = sha256(`${doc.id}:${chunkIndex}:${finalSlice}`);
      chunks.push({
        id,
        documentId: doc.id,
        area: doc.area,
        sourceType: doc.sourceType,
        path: doc.path,
        chunkIndex,
        content: finalSlice,
        checksum: sha256(finalSlice),
        updatedAt: doc.updatedAt,
      });
      chunkIndex += 1;
    }

    if (end >= normalized.length) {
      break;
    }

    const advance = Math.max(1, boundary - overlap);
    start += advance;
  }

  return chunks;
}
