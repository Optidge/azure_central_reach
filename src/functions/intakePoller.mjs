import { app } from "@azure/functions";
import { runIntakePollerWorkflow } from "../workflows/intakePollerWorkflow.mjs";
import { safeLog } from "../lib/safeLog.mjs";
import { buildErrorLog } from "../lib/errors.mjs";

// `dependencies` is passed by tests only; Azure calls the handler with the timer and the context.
export async function intakePoller(timer, context, dependencies = {}) {
  void timer;

  try {
    const summary = await runIntakePollerWorkflow(context, dependencies);
    safeLog("info", "Intake poller finished.", summary);
    // Every object has run and saved its place by now. A run in which one of them failed is
    // thrown, so it shows as a failed run in Azure.
    if (summary.errorsCount > 0) {
      throw new Error(`Intake poller finished with ${summary.errorsCount} error(s)`);
    }
  } catch (error) {
    safeLog(
      "error",
      "Intake poller failed.",
      buildErrorLog({ workflow: "intakePoller", stage: "run", error })
    );
    throw error;
  }
}

// Six-field NCRONTAB: second, minute, hour, day, month, day of week. The top of every hour.
const HOURLY_SCHEDULE = "0 0 * * * *";

// When the poller runs. Hourly unless the app setting INTAKE_POLLER_SCHEDULE holds another
// six-field NCRONTAB string (the sandbox rounds use "0 */5 * * * *"). A value that is not six
// fields is not used. This is read when the module loads, so it never throws: a throw here
// could stop every function from registering.
export function intakePollerSchedule(env = process.env) {
  const value = String(env.INTAKE_POLLER_SCHEDULE ?? "").trim();
  if (!value) {
    return HOURLY_SCHEDULE;
  }
  if (value.split(/\s+/).length !== 6) {
    safeLog(
      "warn",
      "INTAKE_POLLER_SCHEDULE is not a six-field NCRONTAB string. The poller runs hourly."
    );
    return HOURLY_SCHEDULE;
  }
  return value;
}

// The schedule only says how often a run starts. Each run still goes on from its saved
// checkpoints, and the daily sweep still runs once, in the first run at or after 08:00 UTC.
app.timer("intakePoller", {
  schedule: intakePollerSchedule(),
  handler: intakePoller
});
