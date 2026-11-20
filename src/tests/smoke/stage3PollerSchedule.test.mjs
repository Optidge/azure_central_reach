// Stage 3, lane A: the poller's schedule is an app setting (row 3.1; Zeke, 2026-11-20), so the
// sandbox rounds can run every 5 minutes while production stays hourly with nothing set.
import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { app } from "@azure/functions";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const HOURLY = "0 0 * * * *";
const EVERY_FIVE_MINUTES = "0 */5 * * * *";

// The timer is registered when the module loads, so the setting is in place before the import.
process.env.INTAKE_POLLER_SCHEDULE = EVERY_FIVE_MINUTES;
const timer = mock.method(app, "timer", () => {});
const { intakePoller, intakePollerSchedule } = await import("../../functions/intakePoller.mjs");
timer.mock.restore();
delete process.env.INTAKE_POLLER_SCHEDULE;

function warningsDuring(run) {
  const warn = mock.method(console, "warn", () => {});
  try {
    const result = run();
    return { result, warnings: warn.mock.calls.map((call) => call.arguments.map(String).join(" ")) };
  } finally {
    warn.mock.restore();
  }
}

test("[BR14][3.1] INTAKE_POLLER_SCHEDULE not set gives the hourly schedule, with no warning", () => {
  const { result, warnings } = warningsDuring(() => intakePollerSchedule({}));
  assert.equal(result, HOURLY);
  assert.deepEqual(warnings, []);
});

test("[BR14][3.1] a blank INTAKE_POLLER_SCHEDULE gives the hourly schedule, with no warning", () => {
  for (const value of ["", "   ", null, undefined]) {
    const { result, warnings } = warningsDuring(() => intakePollerSchedule({ INTAKE_POLLER_SCHEDULE: value }));
    assert.equal(result, HOURLY);
    assert.deepEqual(warnings, []);
  }
});

test("[BR14][3.1] INTAKE_POLLER_SCHEDULE = 0 */5 * * * * is used as given", () => {
  const { result, warnings } = warningsDuring(() =>
    intakePollerSchedule({ INTAKE_POLLER_SCHEDULE: EVERY_FIVE_MINUTES })
  );
  assert.equal(result, EVERY_FIVE_MINUTES);
  assert.deepEqual(warnings, []);
  // Spaces around the value are not part of it.
  assert.equal(intakePollerSchedule({ INTAKE_POLLER_SCHEDULE: `  ${EVERY_FIVE_MINUTES} ` }), EVERY_FIVE_MINUTES);
});

test("[BR14][3.1] a value that is not six space-separated fields is not used: hourly, and one warning that names the setting", () => {
  for (const value of ["0 */5 * * *", "0 */5 * * * * *", "every 5 minutes", "*/5", "00:05:00"]) {
    const { result, warnings } = warningsDuring(() => intakePollerSchedule({ INTAKE_POLLER_SCHEDULE: value }));
    assert.equal(result, HOURLY, value);
    assert.equal(warnings.length, 1, value);
    assert.equal(warnings[0].includes("INTAKE_POLLER_SCHEDULE"), true);
  }
});

test("[BR14][3.1] the default environment is process.env, and reading the schedule never throws", () => {
  const previous = process.env.INTAKE_POLLER_SCHEDULE;
  try {
    delete process.env.INTAKE_POLLER_SCHEDULE;
    assert.equal(intakePollerSchedule(), HOURLY);
    process.env.INTAKE_POLLER_SCHEDULE = EVERY_FIVE_MINUTES;
    assert.equal(intakePollerSchedule(), EVERY_FIVE_MINUTES);
    process.env.INTAKE_POLLER_SCHEDULE = "not a schedule";
    assert.equal(warningsDuring(() => intakePollerSchedule()).result, HOURLY);
  } finally {
    if (previous === undefined) {
      delete process.env.INTAKE_POLLER_SCHEDULE;
    } else {
      process.env.INTAKE_POLLER_SCHEDULE = previous;
    }
  }
});

test("[BR14][3.1] the timer is registered with the schedule from INTAKE_POLLER_SCHEDULE", () => {
  assert.equal(timer.mock.calls.length, 1);
  const [name, options] = timer.mock.calls[0].arguments;
  assert.equal(name, "intakePoller");
  assert.equal(options.schedule, EVERY_FIVE_MINUTES);
  assert.equal(options.handler, intakePoller);
});

test("[BR14][3.1] the example settings file holds INTAKE_POLLER_SCHEDULE with the hourly value", () => {
  const example = JSON.parse(readFileSync(path.join(ROOT, "local.settings.example.json"), "utf8"));
  assert.equal(example.Values.INTAKE_POLLER_SCHEDULE, HOURLY);
  assert.equal(intakePollerSchedule(example.Values), HOURLY);
});
