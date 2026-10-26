#!/usr/bin/env bash
# Drive the Azure Central Reach Functions host the way an agent verifies it.
# Usage: verify-acr.sh <launch|doctor|curl|cleanup> [args...]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
STATE_DIR="${VERIFY_ACR_STATE_DIR:-/tmp/verify-acr}"
PORT="${VERIFY_ACR_PORT:-17071}"
BASE_URL="${VERIFY_ACR_BASE_URL:-http://127.0.0.1:${PORT}}"
PID_FILE="${STATE_DIR}/func.pid"
LOG_FILE="${STATE_DIR}/func.log"
PORT_FILE="${STATE_DIR}/port"
RUN_ID="${VERIFY_ACR_RUN_ID:-$(date +%Y%m%d-%H%M%S)}"
ARTIFACT_DIR="${VERIFY_ACR_ARTIFACT_DIR:-${SKILL_DIR}/artifacts/${RUN_ID}}"

mkdir -p "${STATE_DIR}" "${ARTIFACT_DIR}"

die() {
  echo "verify-acr: $*" >&2
  exit 1
}

require_repo() {
  [[ -f "${ROOT}/package.json" ]] || die "package.json not found at ${ROOT}"
  [[ -f "${ROOT}/local.settings.json" ]] || die "local.settings.json missing; copy from local.settings.example.json"
  command -v func >/dev/null || die "Azure Functions Core Tools (func) not on PATH"
  command -v curl >/dev/null || die "curl not on PATH"
  command -v node >/dev/null || die "node not on PATH"
}

is_listening() {
  local port="$1"
  if command -v lsof >/dev/null; then
    lsof -nP -iTCP:"${port}" -sTCP:LISTEN >/dev/null 2>&1
  else
    curl -sf --max-time 1 "${BASE_URL}/api/connectivity-test" >/dev/null 2>&1
  fi
}

pid_alive() {
  local pid="$1"
  [[ -n "${pid}" ]] && kill -0 "${pid}" 2>/dev/null
}

cmd_launch() {
  require_repo
  if [[ -f "${PID_FILE}" ]]; then
    local existing
    existing="$(cat "${PID_FILE}")"
    if pid_alive "${existing}"; then
      die "already running pid=${existing} (run cleanup first, or set VERIFY_ACR_STATE_DIR)"
    fi
    rm -f "${PID_FILE}"
  fi
  if is_listening "${PORT}"; then
    die "port ${PORT} already in use; set VERIFY_ACR_PORT to a free port"
  fi

  # Never enable timer/queue triggers during HTTP verification — even if
  # local.settings.json has them Disabled=false for a human session.
  # Dotted names must be passed via env(1); bash cannot export them.
  (
    cd "${ROOT}"
    nohup env \
      "AzureWebJobs.intakePoller.Disabled=true" \
      "AzureWebJobs.processClientQueue.Disabled=true" \
      "AzureWebJobs.processEmployeeQueue.Disabled=true" \
      func start --port "${PORT}" >"${LOG_FILE}" 2>&1 &
    echo $! >"${PID_FILE}"
  )
  echo "${PORT}" >"${PORT_FILE}"

  local ready=0
  for _ in $(seq 1 60); do
    if curl -sf --max-time 2 "${BASE_URL}/api/connectivity-test" >/dev/null 2>&1; then
      ready=1
      break
    fi
    if [[ -f "${PID_FILE}" ]] && ! pid_alive "$(cat "${PID_FILE}")"; then
      die "func exited before ready; see ${LOG_FILE}"
    fi
    sleep 1
  done
  [[ "${ready}" -eq 1 ]] || die "timed out waiting for ${BASE_URL}/api/connectivity-test; see ${LOG_FILE}"

  echo "verify-acr: launched pid=$(cat "${PID_FILE}") base=${BASE_URL} log=${LOG_FILE} artifacts=${ARTIFACT_DIR}"
}

cmd_doctor() {
  require_repo
  local ok=0
  echo "verify-acr doctor"
  echo "  root=${ROOT}"
  echo "  base=${BASE_URL}"
  echo "  artifact_dir=${ARTIFACT_DIR}"

  if [[ -f "${PID_FILE}" ]] && pid_alive "$(cat "${PID_FILE}")"; then
    echo "  process=ok pid=$(cat "${PID_FILE}")"
  else
    echo "  process=missing (expected a launch from this skill)"
    ok=1
  fi

  if [[ -f "${PORT_FILE}" ]]; then
    local recorded
    recorded="$(cat "${PORT_FILE}")"
    if [[ "${recorded}" != "${PORT}" ]]; then
      echo "  port_mismatch=recorded ${recorded} vs VERIFY_ACR_PORT ${PORT}"
      ok=1
    else
      echo "  port=${PORT}"
    fi
  fi

  local body status
  status="$(curl -sS -o "${ARTIFACT_DIR}/doctor-connectivity.json" -w "%{http_code}" --max-time 5 "${BASE_URL}/api/connectivity-test" || true)"
  if [[ "${status}" == "200" ]]; then
    echo "  connectivity-test=http ${status} (body ${ARTIFACT_DIR}/doctor-connectivity.json)"
    body="$(cat "${ARTIFACT_DIR}/doctor-connectivity.json")"
    if echo "${body}" | grep -q '"ok"'; then
      echo "  body_shape=ok"
    else
      echo "  body_shape=unexpected"
      ok=1
    fi
  else
    echo "  connectivity-test=http ${status:-unreachable}"
    ok=1
  fi

  # Confirm timer/queue functions are not the verification surface.
  if [[ -f "${LOG_FILE}" ]] && grep -E "The listener for function 'Functions\.(intakePoller|processClientQueue|processEmployeeQueue)' was unable to start" "${LOG_FILE}" >/dev/null 2>&1; then
    echo "  trigger_warning=listener failed to start (check storage/Service Bus); HTTP routes may still work"
  fi

  if [[ "${ok}" -ne 0 ]]; then
    die "doctor failed — refuse to drive this instance"
  fi
  echo "verify-acr: doctor ok"
}

cmd_curl() {
  # verify-acr.sh curl METHOD PATH [curl args...]
  # PATH is under /api/ (e.g. connectivity-test or intake-poller-test)
  require_repo
  local method="${1:-}"
  local path="${2:-}"
  shift 2 || true
  [[ -n "${method}" && -n "${path}" ]] || die "usage: verify-acr.sh curl METHOD path [extra curl args]"
  path="${path#/}"
  path="${path#api/}"
  local url="${BASE_URL}/api/${path}"
  local out="${ARTIFACT_DIR}/curl-$(echo "${path}" | tr '/' '-')"
  local code
  code="$(curl -sS -D "${out}.headers" -o "${out}.body" -w "%{http_code}" -X "${method}" "$@" "${url}")"
  printf '%s\n' "HTTP ${code}" >"${out}.status"
  echo "verify-acr: ${method} ${url} -> ${code}"
  echo "  status=${out}.status"
  echo "  headers=${out}.headers"
  echo "  body=${out}.body"
  # Non-zero exit only for transport failure; callers assert status/body.
  [[ -n "${code}" ]]
}

cmd_cleanup() {
  if [[ -f "${PID_FILE}" ]]; then
    local pid
    pid="$(cat "${PID_FILE}")"
    if pid_alive "${pid}"; then
      kill "${pid}" 2>/dev/null || true
      for _ in $(seq 1 20); do
        pid_alive "${pid}" || break
        sleep 0.25
      done
      if pid_alive "${pid}"; then
        kill -9 "${pid}" 2>/dev/null || true
      fi
      echo "verify-acr: stopped pid=${pid}"
    else
      echo "verify-acr: pid ${pid} already gone"
    fi
    rm -f "${PID_FILE}"
  else
    echo "verify-acr: no pid file at ${PID_FILE}"
  fi
  # Keep LOG_FILE and ARTIFACT_DIR — evidence survives cleanup.
  echo "verify-acr: cleanup done (artifacts retained under ${ARTIFACT_DIR}; log ${LOG_FILE})"
}

main() {
  local cmd="${1:-}"
  shift || true
  case "${cmd}" in
    launch) cmd_launch "$@" ;;
    doctor) cmd_doctor "$@" ;;
    curl) cmd_curl "$@" ;;
    cleanup) cmd_cleanup "$@" ;;
    *)
      cat >&2 <<'USAGE'
Usage: verify-acr.sh <launch|doctor|curl|cleanup>

  launch   Start func on VERIFY_ACR_PORT (default 17071) with timer/queue disabled
  doctor   Read-only health check; refuse drive if not our instance
  curl     verify-acr.sh curl METHOD path [extra curl args...]
  cleanup  Stop the pid we started; keep artifacts and logs

Env:
  VERIFY_ACR_PORT VERIFY_ACR_BASE_URL VERIFY_ACR_STATE_DIR
  VERIFY_ACR_RUN_ID VERIFY_ACR_ARTIFACT_DIR
USAGE
      exit 2
      ;;
  esac
}

main "$@"
