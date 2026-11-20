// BUILD-PLAN Stage 2, decision 4: when CentralReach answers in a shape the code cannot read, the
// log says in detail why. It holds field names and types only. Never a value, never the body.
import { unreadableCentralReachAnswer } from "../constants/syncReasons.mjs";

const MAX_NAMES = 40;

function typeName(value) {
  if (value === undefined) {
    return "missing";
  }
  if (value === null) {
    return "null";
  }
  if (Array.isArray(value)) {
    return "list";
  }
  if (typeof value === "string") {
    return "text";
  }
  return typeof value;
}

function fieldNames(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }
  return Object.keys(value)
    .slice(0, MAX_NAMES)
    .map((name) => name.slice(0, 60));
}

function valueAt(answer, fieldPath) {
  let current = answer;
  for (const part of fieldPath.split(".")) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return undefined;
    }
    current = current[part];
  }
  return current;
}

// call: method and path template. expectedFields: dotted paths the reader looked for.
export function describeUnreadableAnswer({ call, status, expected, expectedFields = [], answer }) {
  const expectedFieldTypes = {};
  for (const fieldPath of expectedFields) {
    expectedFieldTypes[fieldPath] = typeName(valueAt(answer, fieldPath));
  }
  const list = Array.isArray(answer)
    ? answer
    : expectedFields.map((fieldPath) => valueAt(answer, fieldPath)).find(Array.isArray);

  return {
    call,
    httpStatus: status ?? null,
    expected,
    topLevelFields: fieldNames(answer),
    expectedFieldTypes,
    listLength: list ? list.length : null,
    firstItemFields: list ? fieldNames(list[0]) : []
  };
}

// The error every unreadable-answer reader throws. It is permanent (no retry). answerShape is
// what the worker logs; syncReason is the fixed sentence HubSpot gets.
export function unreadableAnswerError({
  code,
  call,
  status,
  expected,
  expectedFields,
  reasonField,
  answer
}) {
  const error = new Error(`CentralReach answer could not be read: ${call}`);
  error.code = code;
  error.answerShape = describeUnreadableAnswer({ call, status, expected, expectedFields, answer });
  error.syncReason = unreadableCentralReachAnswer(call, reasonField);
  return error;
}
