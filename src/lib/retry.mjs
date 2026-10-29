function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isRetriableStatus(status) {
  if (!status) {
    return false;
  }
  return status === 429 || (status >= 500 && status <= 599);
}

/** Call after withRetry has thrown. An exhausted 429 ends the poller tick. */
export function endTickOnRateLimit(error) {
  return { endTick: error?.response?.status === 429 };
}

export function retryDelayMs(error, fallbackMs, maxDelayMs) {
  const headers = error?.response?.headers;
  const raw =
    headers?.["retry-after"] ||
    headers?.["Retry-After"] ||
    (typeof headers?.get === "function" ? headers.get("retry-after") : undefined);
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(seconds * 1000, maxDelayMs);
  }
  return Math.min(fallbackMs, maxDelayMs);
}

export async function withRetry(fn, options = {}) {
  const {
    maxAttempts = 3,
    baseDelayMs = 400,
    maxDelayMs = 5000
  } = options;

  let attempt = 0;
  let lastError;

  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const status = error?.response?.status;
      if (!isRetriableStatus(status) || attempt >= maxAttempts) {
        throw error;
      }

      const fallbackMs = baseDelayMs * 2 ** (attempt - 1);
      await sleep(retryDelayMs(error, fallbackMs, maxDelayMs));
    }
  }

  throw lastError;
}
