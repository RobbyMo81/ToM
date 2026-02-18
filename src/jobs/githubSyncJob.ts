import cron from "node-cron";
import { getConfig } from "../core/config";
import { logger } from "../core/logger";
import { ToMBrain } from "../core/brain";
import { syncGitHubReport } from "../integrations/githubReportSync";

export function startGitHubSyncJob(): void {
  const config = getConfig();

  if (!config.githubSync.enabled) {
    logger.info("GitHub sync cron is disabled via GITHUB_SYNC_ENABLED=false.");
    return;
  }

  logger.info(`Starting GitHub sync cron with schedule: ${config.githubSync.schedule}`);

  let running = false;
  cron.schedule(config.githubSync.schedule, async () => {
    if (running) {
      logger.warn("GitHub sync skipped: previous run still active.");
      return;
    }

    running = true;
    try {
      const report = await syncGitHubReport(config);
      logger.info("GitHub report sync completed.", report);

      if (config.githubSync.reindexAfterSync) {
        const brain = new ToMBrain();
        try {
          const ingestReport = await brain.ingestLocalKnowledge();
          logger.info("GitHub sync reindex completed.", ingestReport);
        } finally {
          brain.shutdown();
        }
      }
    } catch (error) {
      logger.error("GitHub sync cron failed.", error);
    } finally {
      running = false;
    }
  });
}
