import { ToMBrain } from "./core/brain";
import { logger } from "./core/logger";
import { getConfig } from "./core/config";
import { syncGitHubReport } from "./integrations/githubReportSync";
import { syncWhoiamDocument } from "./integrations/whoiamSync";

async function run(): Promise<void> {
  const [, , command, ...rest] = process.argv;
  const brain = new ToMBrain();

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
      const results = await brain.query(question);
      logger.info(`Query results for: ${question}`);
      for (const result of results) {
        console.log("---");
        console.log(`score=${result.score.toFixed(4)} area=${result.area} source=${result.sourceType}`);
        console.log(`path=${result.path}`);
        console.log(result.content.slice(0, 500));
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
      const result = await brain.generate(question);
      logger.info(`Generated answer for: ${question}`);
      console.log(result.answer);
      return;
    }

    if (command === "cycle") {
      const report = await brain.runCycle();
      logger.info("Cycle report", report);
      return;
    }

    if (command === "github-sync") {
      const config = getConfig();
      const syncReport = await syncGitHubReport(config);
      logger.info("GitHub sync report", syncReport);

      if (config.githubSync.reindexAfterSync) {
        const ingest = await brain.ingestLocalKnowledge();
        logger.info("GitHub sync reindex report", ingest);
      }
      return;
    }

    if (command === "whoiam-sync") {
      const config = getConfig();
      const report = await syncWhoiamDocument(config);
      logger.info("WhoAmI sync report", report);
      return;
    }

    console.log("Usage:");
    console.log("  npm run ingest");
    console.log('  npm run query -- "<question>"');
    console.log('  npm run generate -- "<question>"');
    console.log("  npm run cycle");
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
