import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const TARGET_FILE = path.resolve(process.cwd(), "docs/reference/AsBuilt_Architecture_Snapshot_2026-02-19.md");

function countReviewStatus(content: string): { total: number; approved: number } {
  const signoffIndex = content.indexOf("## Peer Review Sign-off");
  if (signoffIndex < 0) {
    throw new Error("Peer Review Sign-off section not found.");
  }

  const tableSection = content.slice(signoffIndex);
  const rowMatches = [...tableSection.matchAll(/^\|\s*(\d+)\s*\|.*?\|\s*([^|]+?)\s*\|\s*$/gm)];

  let total = 0;
  let approved = 0;

  for (const match of rowMatches) {
    const recordNumber = Number(match[1]);
    if (!Number.isFinite(recordNumber)) {
      continue;
    }

    total += 1;
    const status = match[2].trim().toLowerCase();
    if (status === "approved") {
      approved += 1;
    }
  }

  return { total, approved };
}

function updateProgressBlock(content: string, approved: number, total: number): string {
  const pending = Math.max(0, total - approved);
  const today = new Date().toISOString().slice(0, 10);

  const block = [
    "## Peer Review Progress",
    "",
    `- peer_review_completed: \`${approved}/${total}\``,
    `- peer_review_pending: \`${pending}/${total}\``,
    `- last_progress_update: \`${today}\``,
  ].join("\n");

  if (!content.includes("## Peer Review Progress")) {
    throw new Error("Peer Review Progress section not found.");
  }

  return content.replace(/## Peer Review Progress[\s\S]*?## Record 1/, `${block}\n\n## Record 1`);
}

async function run(): Promise<void> {
  const original = await readFile(TARGET_FILE, "utf8");
  const { total, approved } = countReviewStatus(original);
  const updated = updateProgressBlock(original, approved, total);

  if (updated !== original) {
    await writeFile(TARGET_FILE, updated, "utf8");
  }

  console.log(`Peer review progress updated: ${approved}/${total} approved`);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
