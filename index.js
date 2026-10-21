/**
 * ghc-latency — honest browser-side latency measurement.
 *
 * Measures real transport round-trip time from the visitor's browser to any
 * HTTP(S) endpoint, the way GameHostCloud measures region latency on
 * https://gamehostcloud.com — no estimates, no server-side guessing.
 *
 * How it works:
 *   - A cache-busted fetch to a tiny endpoint. The endpoint does not need to
 *     return 2xx — a 404/204 costs the same transport RTT and is often the
 *     cheapest byte the server will send.
 *   - Multiple samples; the *best* (minimum) sample approximates the true
 *     network RTT, filtering out JS scheduling jitter.
 *   - HTTP/2-capable endpoints include TLS handshake on first connect
 *     (~2-3x RTT), so the first sample is naturally warm-up unless you pass
 *     `warmup: 0`.
 *
 * MIT licensed. Works in every modern browser; no dependencies.
 */

export const DEFAULT_SAMPLES = 4;
export const DEFAULT_WARMUP = 1;
export const MIN_VALID_MS = 1; // sub-ms results indicate cache/local shenanigans

/**
 * Measure round-trip time to a single endpoint.
 *
 * @param {string} url            Endpoint URL. Any status code counts.
 * @param {object} [options]
 * @param {number} [options.samples]  Number of timed samples (default 4).
 * @param {number} [options.warmup]   Un-timed warm-up requests (default 1) —
 *                                    absorbs TLS handshake + HTTP/2 setup.
 * @param {AbortSignal} [options.signal]  Abort the whole measurement.
 * @param {number} [options.timeout]  Per-request timeout in ms (default 8000).
 * @returns {Promise<null | {best:number, median:number, samples:number[]}>}
 *          null when every sample failed or was aborted.
 */
export async function measureLatency(url, options = {}) {
  const samples = options.samples ?? DEFAULT_SAMPLES;
  const warmup = options.warmup ?? DEFAULT_WARMUP;
  const timeout = options.timeout ?? 8000;
  const parentSignal = options.signal;

  const cacheBusted = () =>
    `${url}${url.includes('?') ? '&' : '?'}_=${Date.now()}${Math.random().toString(36).slice(2)}`;

  const timedFetch = async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const onAbort = () => controller.abort();
    if (parentSignal) parentSignal.addEventListener('abort', onAbort, { once: true });
    try {
      const start = performance.now();
      await fetch(cacheBusted(), {
        method: 'GET',
        cache: 'no-store',
        mode: 'cors',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        signal: controller.signal,
      });
      return performance.now() - start;
    } finally {
      clearTimeout(timer);
      if (parentSignal) parentSignal.removeEventListener('abort', onAbort);
    }
  };

  // Warm-up: TLS + h2 setup is a one-off cost, not per-request RTT.
  for (let i = 0; i < warmup; i++) {
    try { await timedFetch(); } catch { /* endpoint may be down; samples decide */ }
    if (parentSignal?.aborted) return null;
  }

  const measured = [];
  for (let i = 0; i < samples; i++) {
    if (parentSignal?.aborted) return null;
    try {
      const rtt = await timedFetch();
      if (rtt >= MIN_VALID_MS) measured.push(rtt);
    } catch {
      /* failed sample — skip */
    }
  }
  if (measured.length === 0) return null;

  measured.sort((a, b) => a - b);
  const median = measured[Math.floor(measured.length / 2)];
  return { best: measured[0], median, samples: measured };
}

/**
 * Measure several endpoints (e.g. regions) in parallel.
 *
 * @param {Record<string, string>} endpoints  label -> URL
 * @param {object} [options]                  same options as measureLatency
 * @param {(label:string, result:object|null) => void} [onResult]
 * @returns {Promise<Record<string, object|null>>}  label -> result
 */
export async function measureRegions(endpoints, options = {}, onResult) {
  const labels = Object.keys(endpoints);
  const results = await Promise.all(
    labels.map((label) => measureLatency(endpoints[label], options)),
  );
  const out = {};
  labels.forEach((label, i) => {
    out[label] = results[i];
    onResult?.(label, results[i]);
  });
  return out;
}
