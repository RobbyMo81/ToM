import { readFile } from "node:fs/promises";
import path from "node:path";
import { glob } from "glob";
import { sha256 } from "../core/hash";
import { type AppConfig } from "../core/config";
import { type KnowledgeArea, type KnowledgeDocument } from "../core/types";

function inferArea(filename: string): KnowledgeArea {
  const lower = filename.toLowerCase();
  if (lower.startsWith("learn-")) {
    return "Learn";
  }
  if (lower.startsWith("lesson-") || lower.startsWith("lessons-")) {
    return "Lesson";
  }
  if (lower.startsWith("plan-")) {
    return "Plan";
  }
  return "Other";
}

function inferTags(area: KnowledgeArea, filename: string): string[] {
  const baseTags = [area.toLowerCase()];
  const normalized = filename.replace(/\.md$/i, "");
  const tokenized = normalized
    .split(/[-_\s]+/)
    .map((part) => part.toLowerCase())
    .filter((part) => part.length > 2);

  return Array.from(new Set([...baseTags, ...tokenized])).slice(0, 15);
}

function inferContextTags(relativePath: string): string[] {
  const normalized = relativePath.replace(/\\/g, "/").toLowerCase();

  if (normalized.startsWith("automation/")) {
    return ["sop", "automation", "autonomy", "runbook", "operations", "task-execution"];
  }

  return [];
}

export async function loadKnowledgeDocs(config: AppConfig): Promise<KnowledgeDocument[]> {
  // Explicitly include docs and reports under docs/reports for clarity
  const patterns = ["docs/**/*.md", "docs/reports/**/*.md"];

  const matches = await glob(patterns, {
    cwd: config.knowledgeDir,
    absolute: true,
    nodir: true,
    ignore: ["*.md", "automation/**/*.md", "node_modules/**", "dist/**", "memory/**", ".git/**", "packages/**"],
  });

  const docs: KnowledgeDocument[] = [];

  for (const absolutePath of matches) {
    const filename = path.basename(absolutePath);
    const relativePath = path.relative(config.knowledgeDir, absolutePath);
    const content = await readFile(absolutePath, "utf8");
    const area = inferArea(filename);
    const title = relativePath.replace(/\.md$/i, "");
    const checksum = sha256(content);
    const contextTags = inferContextTags(relativePath);

    docs.push({
      id: sha256(`local:${absolutePath}`),
      area,
      title,
      path: absolutePath,
      sourceType: "local",
      content,
      checksum,
      updatedAt: new Date().toISOString(),
      tags: Array.from(new Set([...inferTags(area, filename), ...contextTags])).slice(0, 20),
    });
  }

  return docs;
}
