import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { type AppConfig } from "../core/config";
import { sha256 } from "../core/hash";
import { type KnowledgeDocument } from "../core/types";
import { type BraveResult } from "./braveClient";

export async function braveResultsToDocuments(
  query: string,
  results: BraveResult[],
  config: AppConfig
): Promise<KnowledgeDocument[]> {
  await mkdir(config.webCacheDir, { recursive: true });

  const docs: KnowledgeDocument[] = [];

  for (const [index, result] of results.entries()) {
    const content = `Query: ${query}\nTitle: ${result.title}\nURL: ${result.url}\nSummary: ${result.description}`;
    const id = sha256(`web:${query}:${result.url}`);
    const filename = `${id}.md`;
    const filePath = path.join(config.webCacheDir, filename);

    const persistedContent = [
      "# Web Intelligence Snapshot",
      "",
      `- query: ${query}`,
      `- title: ${result.title}`,
      `- url: ${result.url}`,
      `- captured_at: ${new Date().toISOString()}`,
      "",
      result.description,
    ].join("\n");

    await writeFile(filePath, persistedContent, "utf8");

    docs.push({
      id,
      area: "Plan",
      title: `web-${query}-${index + 1}`,
      path: filePath,
      sourceType: "web",
      content,
      checksum: sha256(content),
      updatedAt: new Date().toISOString(),
      tags: ["web", "brave", "external", "plan"],
    });
  }

  return docs;
}
