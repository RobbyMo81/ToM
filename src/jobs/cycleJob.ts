import cron from "node-cron";
import { getConfig } from "../core/config";
import { logger } from "../core/logger";
import { ToMBrain } from "../core/brain";

export function startCycleJob(): void {
  const config = getConfig();
  const schedule = config.cronSchedule;

  logger.info(`Starting ToM brain cron with schedule: ${schedule}`);

  cron.schedule(schedule, async () => {
    const brain = new ToMBrain();
    try {
      const report = await brain.runCycle();
      logger.info("Cycle completed", report);
    } catch (error) {
      logger.error("Cycle failed", error);
    } finally {
      brain.shutdown();
    }
  });
}
