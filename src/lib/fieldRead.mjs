/**
 * @typedef {{ kind: "absent", name: string }} AbsentField
 * @typedef {{ kind: "blank", name: string }} BlankField
 * @typedef {{ kind: "present", name: string, value: string }} PresentField
 * @typedef {AbsentField | BlankField | PresentField} FieldRead
 * @typedef {Readonly<Record<string, FieldRead>>} FieldMap
 */

/**
 * A key missing from a 200 property bag is absent. HubSpot omits a requested
 * name it has no definition for, or one the token cannot read. Absent is not
 * blank and never becomes null.
 * @returns {FieldRead}
 */
export function readProperty(properties, name) {
  if (!properties || !Object.hasOwn(properties, name)) {
    return { kind: "absent", name };
  }
  const raw = properties[name];
  if (raw === null || raw === undefined || String(raw).trim() === "") {
    return { kind: "blank", name };
  }
  return { kind: "present", name, value: String(raw) };
}

/** @returns {FieldMap} */
export function readRequestedProperties(properties, requestedNames) {
  const map = {};
  for (const name of requestedNames) {
    map[name] = readProperty(properties, name);
  }
  return Object.freeze(map);
}

/** @returns {string[]} */
export function absentNames(fieldMap) {
  return Object.values(fieldMap)
    .filter((field) => field.kind === "absent")
    .map((field) => field.name);
}

export class RequestedPropertyAbsentError extends Error {
  constructor(names) {
    super(`RequestedPropertyAbsent: ${names.join(",")}`);
    this.code = "REQUESTED_PROPERTY_ABSENT";
    this.absentNames = names;
  }
}

/**
 * Fails closed before any CentralReach call when a requested key is absent.
 * The error message carries field names only, never values.
 */
export function assertNoAbsentProperties(properties, requestedNames) {
  const missing = absentNames(readRequestedProperties(properties, requestedNames));
  if (missing.length > 0) {
    throw new RequestedPropertyAbsentError(missing);
  }
}
