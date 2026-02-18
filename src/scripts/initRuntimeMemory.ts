import { getConfig } from "../core/config";
import { logger } from "../core/logger";
import { RuntimeMemoryStore } from "../integrations/runtimeMemoryStore";

function run(): void {
  const config = getConfig();
  const store = new RuntimeMemoryStore(config.runtimeDbPath);

  try {
    store.bootstrap();
    logger.info("Runtime memory database initialized.", {
      runtimeDbPath: config.runtimeDbPath,
    });
  } finally {
    store.close();
  }
}

run();
