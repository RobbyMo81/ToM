import { ToMBrain } from "../core/brain";
import { logger } from "../core/logger";

process.env.VECTOR_DB_PATH = "memory/as-built.sqlite";

async function run(): Promise<void> {
  const [, , command, ...rest] = process.argv;
  const brain = new ToMBrain();

  try {
    if (command === "ingest") {
      const report = await brain.ingestLocalKnowledge();
      logger.info("As-built ingestion complete", report);
      return;
    }

    if (command === "query") {
      const question = rest.join(" ").trim();
      if (!question) {
        throw new Error('Provide a query string. Example: npm run asbuilt:query -- "Summarize architecture state"');
      }

      const results = await brain.query(question);
      logger.info(`As-built query results for: ${question}`);

      for (const result of results) {
        console.log("---");
        console.log(`score=${result.score.toFixed(4)} area=${result.area} source=${result.sourceType}`);
        console.log(`path=${result.path}`);
        console.log(result.content.slice(0, 500));
      }

      return;
    }

    if (command === "generate") {
      const prompt = rest.join(" ").trim();
      if (!prompt) {
        throw new Error('Provide a prompt string. Example: npm run asbuilt:generate -- "Summarize architecture status"');
      }

      const generated = await brain.generate(prompt);
      logger.info(`As-built generated answer for: ${prompt}`);
      console.log(generated.answer);
      return;
    }

    console.log("Usage:");
    console.log("  npm run asbuilt:ingest");
    console.log('  npm run asbuilt:query -- "<question>"');
    console.log('  npm run asbuilt:generate -- "<prompt>"');
    process.exitCode = 1;
  } finally {
    brain.shutdown();
  }
}

run().catch((error) => {
  logger.error("As-built CLI failed", error);
  process.exitCode = 1;
});
