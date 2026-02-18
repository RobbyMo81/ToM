import { startCycleJob } from "./jobs/cycleJob";
import { logger } from "./core/logger";
import { startHttpApi } from "./api/httpServer";
import { startGitHubSyncJob } from "./jobs/githubSyncJob";
import { startWhoiamSyncJob } from "./jobs/whoiamSyncJob";

startCycleJob();
startGitHubSyncJob();
startWhoiamSyncJob();
startHttpApi();
logger.info("ToM brain scheduler is live.");
