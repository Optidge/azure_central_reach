import { CosmosClient } from "@azure/cosmos";

let cosmosContainer;

export function createStateClient(config) {
  const client = new CosmosClient({
    endpoint: config.state.cosmosEndpoint,
    key: config.state.cosmosKey
  });

  const database = client.database(config.state.cosmosDatabaseId);
  cosmosContainer = database.container(config.state.cosmosContainerId);
  return cosmosContainer;
}

// Tests pass in an in-memory container, so the leases and the state writes run for real.
export function useStateContainer(container) {
  cosmosContainer = container;
  return cosmosContainer;
}

function requireContainer() {
  if (!cosmosContainer) {
    throw new Error("State client is not initialized");
  }
  return cosmosContainer;
}

function leaseDocument({ pk, id, ttlSeconds }) {
  const now = Date.now();
  return {
    id,
    pk,
    type: "lease",
    // The item lives twice as long as the lease. Cosmos stops returning an item once its ttl has
    // passed, so an item that expired together with the lease could never be read and taken over.
    ttl: ttlSeconds * 2,
    createdAt: new Date(now).toISOString(),
    // The lease carries its own expiry. The item being there does not mean the lease is held.
    expiresAt: new Date(now + ttlSeconds * 1000).toISOString()
  };
}

function ifMatch(etag) {
  return { accessCondition: { type: "IfMatch", condition: etag } };
}

// Returns the lease, or null when an item with this id is already there (409).
async function createLease(container, lease) {
  try {
    const created = await container.items.create(lease);
    return { pk: lease.pk, id: lease.id, etag: created.etag };
  } catch (error) {
    if (error.code !== 409) {
      throw error;
    }
    return null;
  }
}

// Returns the lease ({ pk, id, etag }) or false when another run holds it. The etag is the
// owner token: only the run that holds it can release the lease.
export async function acquireLease({ pk, id, ttlSeconds }) {
  const container = requireContainer();
  if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
    throw new Error("A lease needs ttlSeconds (LEASE_TTL_SECONDS)");
  }

  const lease = leaseDocument({ pk, id, ttlSeconds });
  const created = await createLease(container, lease);
  if (created) {
    return created;
  }

  // Someone created this lease before. Take it over only if it has expired, and only if nobody
  // else changed it since we read it.
  const current = await getState({ pk, id });
  if (!current) {
    // Released since the conflict, or already expired in Cosmos. One more create, then busy.
    return (await createLease(container, lease)) || false;
  }
  const expiresAtMs = Date.parse(current.expiresAt ?? "");
  if (!Number.isFinite(expiresAtMs) || expiresAtMs > Date.now()) {
    return false;
  }
  try {
    const replaced = await container.item(id, pk).replace(lease, ifMatch(current._etag));
    return { pk, id, etag: replaced.etag };
  } catch (error) {
    if (error.code === 412 || error.code === 404) {
      return false;
    }
    throw error;
  }
}

// Deletes the lease only when it still carries this run's etag. A run whose lease expired and
// was taken over deletes nothing.
export async function releaseLease({ pk, id, etag }) {
  const container = requireContainer();
  if (!etag) {
    return false;
  }

  try {
    await container.item(id, pk).delete(ifMatch(etag));
    return true;
  } catch (error) {
    if (error.code === 404 || error.code === 412) {
      return false;
    }
    throw error;
  }
}

export async function hasState({ pk, id }) {
  const item = await getState({ pk, id });
  return Boolean(item);
}

// ttlSeconds -1 means the item never expires. The container's default is 30 days.
export async function putState({ pk, id, type, ttlSeconds, data }) {
  const container = requireContainer();

  const nowIso = new Date().toISOString();
  const item = {
    id,
    pk,
    type,
    ttl: ttlSeconds,
    data: data || {},
    updatedAt: nowIso
  };

  await container.items.upsert(item);
  return item;
}

export async function getState({ pk, id }) {
  const container = requireContainer();

  try {
    const { resource } = await container.item(id, pk).read();
    return resource ?? null;
  } catch (error) {
    if (error.code === 404) {
      return null;
    }
    throw error;
  }
}
