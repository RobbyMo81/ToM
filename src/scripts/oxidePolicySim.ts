import { randomUUID } from "node:crypto";
import {
  createCycleProposalPayload,
  decideCycleProposalPolicy,
  validateCycleProposalPayload,
} from "../core/oxideGovernance";
import { type CycleReport } from "../core/types";

interface Scenario {
  name: string;
  report: CycleReport;
  recommendedActions: string[];
}

function runScenario(scenario: Scenario): string {
  const payload = createCycleProposalPayload(`workflow:${randomUUID()}`, scenario.report, scenario.recommendedActions);
  const validation = validateCycleProposalPayload(payload);
  const decision = decideCycleProposalPolicy(payload, validation);

  const status = decision.policyPass ? "PASS" : "BLOCK";
  return [
    `${scenario.name}: ${status}`,
    `risk=${decision.riskLevel}`,
    `determinism=${decision.determinismScore.toFixed(2)}`,
    `reason=${decision.reason}`,
  ].join(" | ");
}

function main(): void {
  const now = new Date().toISOString();

  const scenarios: Scenario[] = [
    {
      name: "nominal-indexed",
      report: {
        startedAt: now,
        finishedAt: now,
        documentsDiscovered: 10,
        documentsIndexed: 5,
        chunksIndexed: 44,
        webQueriesRun: 1,
        webDocumentsIndexed: 2,
      },
      recommendedActions: ["Maintain current ingest cadence and monitor drift indicators."],
    },
    {
      name: "zero-indexed",
      report: {
        startedAt: now,
        finishedAt: now,
        documentsDiscovered: 5,
        documentsIndexed: 0,
        chunksIndexed: 0,
        webQueriesRun: 0,
        webDocumentsIndexed: 0,
      },
      recommendedActions: ["Review upstream knowledge ingestion inputs."],
    },
  ];

  for (const scenario of scenarios) {
    console.log(runScenario(scenario));
  }
}

main();
