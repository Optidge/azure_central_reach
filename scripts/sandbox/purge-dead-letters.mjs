// Empties the dead-letter sub-queues of client-sync-queue and employee-sync-queue (BUILD-PLAN
// step 7.3: "purge both dead-letter queues (never replay)"). Messages are received in
// receive-and-delete mode and dropped: nothing is re-sent, and no message body, ID or property
// is printed, only counts.
//
// Run from the repo root (Zeke runs it; it uses the Service Bus connection string):
//   node scripts/sandbox/purge-dead-letters.mjs            count only, deletes nothing
//   node scripts/sandbox/purge-dead-letters.mjs --confirm  deletes every dead-lettered message
//
// The connection string comes from the SERVICE_BUS_CONNECTION_STRING environment variable, or
// else from local.settings.json Values. It is never printed. The script refuses any namespace
// other than ucr-hs-cr-sb-prod and any queue other than the two below.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ServiceBusClient } from "@azure/service-bus";

const NAMESPACE_HOST = "ucr-hs-cr-sb-prod.servicebus.windows.net";
const QUEUES = ["client-sync-queue", "employee-sync-queue"];
const BATCH_SIZE = 100;
const WAIT_MS = 5000;
const EMPTY_BATCHES_TO_STOP = 2; // a receive can return empty while messages are still there

const confirm = process.argv.includes("--confirm");

function connectionString() {
  if (process.env.SERVICE_BUS_CONNECTION_STRING) return process.env.SERVICE_BUS_CONNECTION_STRING;
  let values;
  try {
    values = JSON.parse(readFileSync(resolve("local.settings.json"), "utf8"))?.Values || {};
  } catch {
    throw new Error("Set SERVICE_BUS_CONNECTION_STRING, or run from the repo root with local.settings.json.");
  }
  const value = values.SERVICE_BUS_CONNECTION_STRING;
  if (!value || value === "CHANGE_ME") {
    throw new Error("SERVICE_BUS_CONNECTION_STRING is not set (environment or local.settings.json).");
  }
  return value;
}

function checkNamespace(value) {
  const endpoint = /Endpoint=sb:\/\/([^/;]+)/i.exec(value)?.[1]?.toLowerCase();
  if (endpoint !== NAMESPACE_HOST) {
    throw new Error(`The connection string is not for ${NAMESPACE_HOST}; nothing was done.`);
  }
}

async function countDeadLetters(client, queue) {
  const receiver = client.createReceiver(queue, { subQueueType: "deadLetter" });
  let count = 0;
  try {
    for (;;) {
      const batch = await receiver.peekMessages(BATCH_SIZE);
      if (!batch.length) break;
      count += batch.length;
    }
  } finally {
    await receiver.close();
  }
  return count;
}

async function purgeDeadLetters(client, queue) {
  const receiver = client.createReceiver(queue, {
    subQueueType: "deadLetter",
    receiveMode: "receiveAndDelete"
  });
  let deleted = 0;
  let emptyBatches = 0;
  try {
    while (emptyBatches < EMPTY_BATCHES_TO_STOP) {
      const batch = await receiver.receiveMessages(BATCH_SIZE, { maxWaitTimeInMs: WAIT_MS });
      if (!batch.length) {
        emptyBatches += 1;
        continue;
      }
      emptyBatches = 0;
      deleted += batch.length;
      console.log(`  ${queue}: ${deleted} deleted so far`);
    }
  } finally {
    await receiver.close();
  }
  return deleted;
}

async function main() {
  const value = connectionString();
  checkNamespace(value);
  const client = new ServiceBusClient(value);
  try {
    for (const queue of QUEUES) {
      if (confirm) {
        const deleted = await purgeDeadLetters(client, queue);
        const left = await countDeadLetters(client, queue);
        console.log(`${queue}: deleted ${deleted}; dead letters left ${left}`);
      } else {
        console.log(`${queue}: ${await countDeadLetters(client, queue)} dead letters (count only)`);
      }
    }
    if (!confirm) console.log("Nothing deleted. Re-run with --confirm to purge.");
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  // The message names the problem; it never holds the connection string.
  console.error(`Failed: ${error?.code || error?.name || "error"}: ${error?.message || error}`);
  process.exit(1);
});
