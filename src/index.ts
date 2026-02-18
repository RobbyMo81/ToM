import { startCycleJob } from "./jobs/cycleJob";
import { logger } from "./core/logger";
import { startHttpApi } from "./api/httpServer";

startCycleJob();
startHttpApi();
logger.info("ToM brain scheduler is live.");
