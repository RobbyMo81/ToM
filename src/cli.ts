import { ToMBrain } from "./core/brain";
import { logger } from "./core/logger";

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
        throw new Error("Provide a query string. Example: npm run query -- \"what did I learn about ssh hardening?\"");
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

    if (command === "cycle") {
      const report = await brain.runCycle();
      logger.info("Cycle report", report);
      return;
    }

    console.log("Usage:");
    console.log("  npm run ingest");
    console.log("  npm run query -- \"<question>\"");
    console.log("  npm run cycle");
  } finally {
    brain.shutdown();
  }
}

run().catch((error) => {
  logger.error("CLI failed", error);
  process.exitCode = 1;
});
