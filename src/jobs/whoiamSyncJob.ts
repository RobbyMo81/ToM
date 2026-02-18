import cron from "node-cron";
import { getConfig } from "../core/config";
import { logger } from "../core/logger";
import { syncWhoiamDocument } from "../integrations/whoiamSync";

export function startWhoiamSyncJob(): void {
  const config = getConfig();

  if (!config.whoiamSync.enabled) {
    logger.info("WhoAmI sync cron is disabled via WHOIAM_SYNC_ENABLED=false.");
    return;
  }

  logger.info(`Starting WhoAmI sync cron with schedule: ${config.whoiamSync.schedule}`);

  let running = false;
  cron.schedule(config.whoiamSync.schedule, async () => {
    if (running) {
      logger.warn("WhoAmI sync skipped: previous run still active.");
      return;
    }

    running = true;
    try {
      const report = await syncWhoiamDocument(config);
      logger.info("WhoAmI sync completed.", report);
    } catch (error) {
      logger.error("WhoAmI sync cron failed.", error);
    } finally {
      running = false;
    }
  });
}
