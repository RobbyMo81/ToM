import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createCycleProposalPayload, validateCycleProposalPayload } from "../core/oxideGovernance";
import { type CycleReport } from "../core/types";

function parseInputArg(argv: string[]): string | undefined {
  const direct = argv.find((arg) => arg.startsWith("--input="));
  if (direct) {
    return direct.slice("--input=".length);
  }

  const markerIndex = argv.findIndex((arg) => arg === "--input");
  if (markerIndex >= 0) {
    return argv[markerIndex + 1];
  }

  return undefined;
}

function buildSamplePayload(): unknown {
  const now = new Date().toISOString();
  const sampleReport: CycleReport = {
    startedAt: now,
    finishedAt: now,
    documentsDiscovered: 4,
    documentsIndexed: 3,
    chunksIndexed: 12,
    webQueriesRun: 0,
    webDocumentsIndexed: 0,
  };

  return createCycleProposalPayload(`workflow:${randomUUID()}`, sampleReport, [
    "Maintain current ingest cadence and monitor drift indicators.",
  ]);
}

function loadPayloadFromArgs(argv: string[]): unknown {
  const inputPath = parseInputArg(argv);
  if (!inputPath) {
    return buildSamplePayload();
  }

  const contents = readFileSync(inputPath, "utf8");
  return JSON.parse(contents) as unknown;
}

function main(): void {
  const payload = loadPayloadFromArgs(process.argv.slice(2));
  const result = validateCycleProposalPayload(payload);

  if (!result.valid) {
    console.error("oxide:validate-proposal FAIL");
    for (const error of result.errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("oxide:validate-proposal PASS");
}

main();
