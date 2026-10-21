/**
 * ghc-latency — browser RTT measurement.
 * Measure real round-trip latency from the visitor's browser to any HTTP(S) endpoint.
 */

export interface MeasureLatencyOptions {
  /** Number of timed samples taken after warmup (default 4). */
  samples?: number;
  /** Requests fired before sampling — absorbs TLS/H2 connection setup (default 1). */
  warmup?: number;
  /** AbortSignal to cancel the measurement. */
  signal?: AbortSignal;
  /** Per-request timeout in ms (default 5000). */
  timeout?: number;
}

export interface LatencyResult {
  /** Best (minimum) observed RTT in ms — the number to show users. */
  best: number;
  /** Median observed RTT in ms — useful for jitter detection. */
  median: number;
  /** All valid sample values in ms. */
  samples: number[];
}

/**
 * Measure RTT to one URL. Returns null when every request fails
 * or no valid sample is produced.
 */
export function measureLatency(
  url: string,
  options?: MeasureLatencyOptions,
): Promise<LatencyResult | null>;

/**
 * Measure many regions in parallel. `endpoints` maps a display label
 * ("Frankfurt (DE)") to a URL whose origin RTT represents the region.
 * `onResult` fires as each label completes. Resolves to a label → result map.
 */
export function measureRegions(
  endpoints: Record<string, string>,
  options?: MeasureLatencyOptions,
  onResult?: (label: string, result: LatencyResult | null) => void,
): Promise<Record<string, LatencyResult | null>>;
