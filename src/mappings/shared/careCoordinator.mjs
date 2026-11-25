// O-17: the Care Coordinator, one rule for both objects (Zeke 2026-11-25, batch 3 item 11, 11.a,
// 11.b and A). The Case sends it to Client Meta 138851 (C10), the BCBA to Employee Meta 140495
// (B11). Both read the same three fields Zeke's coordinator workflows keep on the record, and the
// status those workflows set. The integration trusts `ready` and reads no owner, no owners API, no
// Team Member, no care_coordinator_name and no coordinator_export_source_snapshot.
//   ready      first name, last name, email, one per line ("\n" only). Each part is trimmed and
//              its inner whitespace (line breaks too) becomes one space. A blank part is skipped,
//              never an empty line. All three blank: as not ready.
//   no_owner   blank (null): clears only a value the integration wrote.
//   any other status, or blank: left out (not sent, not cleared, saved hash kept, row 3.18), with
//              the warning care_coordinator_not_ready. It names the status, never a name or email.
export const COORDINATOR_STATUS_PROPERTY = "coordinator_export_status";

// The HubSpot properties the rule reads, in line order, then the status. Both objects map all four.
export const CARE_COORDINATOR_PROPERTIES = Object.freeze([
  "care_coordinator_first_name",
  "care_coordinator_last_name",
  "care_coordinator_email",
  COORDINATOR_STATUS_PROPERTY
]);

// LF only, never CRLF (open point CC-1: whether CentralReach keeps it in an `input` field).
export const COORDINATOR_LINE_SEPARATOR = "\n";

const LINE_PROPERTIES = CARE_COORDINATOR_PROPERTIES.slice(0, 3);

// The options of coordinator_export_status (CF §1.1). Only these are named in the warning.
const COORDINATOR_STATUSES = Object.freeze([
  "refreshing",
  "ready",
  "no_owner",
  "missing_match",
  "duplicate_match",
  "inactive",
  "incomplete",
  "error"
]);

const OMIT = Object.freeze({ omit: true });

function trimmedOrNull(value) {
  if (value === undefined || value === null) {
    return null;
  }
  return String(value).trim() || null;
}

// Trimmed, every run of whitespace one space, so no part carries its own line break. null if blank.
function singleSpacedOrNull(value) {
  return trimmedOrNull(value)?.replace(/\s+/g, " ") ?? null;
}

function coordinatorNotReady(status) {
  const named = status === null ? "blank" : COORDINATOR_STATUSES.includes(status) ? status : "unknown";
  return {
    ...OMIT,
    warning: {
      code: "care_coordinator_not_ready",
      property: COORDINATOR_STATUS_PROPERTY,
      status: named,
      message: `The Care Coordinator is not ready (status ${named}); the field is not sent.`
    }
  };
}

// Returns { value }, { value: null } or { omit: true, warning }.
export function careCoordinatorValue(properties) {
  // Compared case-sensitively, as stored.
  const status = trimmedOrNull(properties?.[COORDINATOR_STATUS_PROPERTY]);
  if (status === "no_owner") {
    return { value: null };
  }
  if (status !== "ready") {
    return coordinatorNotReady(status);
  }
  const lines = LINE_PROPERTIES.map((name) => singleSpacedOrNull(properties[name])).filter(Boolean);
  return lines.length ? { value: lines.join(COORDINATOR_LINE_SEPARATOR) } : coordinatorNotReady(status);
}
