const SHARED_WRITEBACK_PROPERTIES = [
  "last_sync_status",
  "last_sync_at",
  "last_sync_error",
  "last_sync_hash",
  "integration_last_write",
  "updated_by_integration"
];

const CLIENT_WRITEBACK_PROPERTIES = [
  ...SHARED_WRITEBACK_PROPERTIES,
  "central_reach_link_to_client"
];

const EMPLOYEE_WRITEBACK_PROPERTIES = [
  ...SHARED_WRITEBACK_PROPERTIES,
  "central_reach_link_to_rt_rbt",
  "central_reach_record_link"
];

export function filterWritebackProperties(properties, { kind, idProperty } = {}) {
  const allowed = new Set(
    kind === "employee" ? EMPLOYEE_WRITEBACK_PROPERTIES : CLIENT_WRITEBACK_PROPERTIES
  );
  const idName = String(idProperty || "").trim();
  if (idName) {
    allowed.add(idName);
  }

  const filtered = {};
  for (const [key, value] of Object.entries(properties || {})) {
    if (allowed.has(key)) {
      filtered[key] = value;
    }
  }
  return filtered;
}
