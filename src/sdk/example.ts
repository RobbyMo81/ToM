import { ToMBrainClient } from "./tomBrainClient";

async function main(): Promise<void> {
  const client = new ToMBrainClient({
    baseUrl: process.env.TOM_API_URL ?? "http://127.0.0.1:8787",
    token: process.env.TOM_API_TOKEN,
  });

  const health = await client.health();
  console.log("Health:", health);

  const stats = await client.stats();
  console.log("Stats:", stats);

  try {
    const query = await client.query("What lessons did I record about SSH hardening?", 5);
    console.log("Query count:", query.count);
    if (query.results[0]) {
      console.log("Top result path:", query.results[0].path);
      console.log("Top result score:", query.results[0].score);
    }
  } catch (error) {
    console.warn("Query demo skipped:", error instanceof Error ? error.message : error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
