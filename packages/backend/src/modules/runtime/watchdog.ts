/**
 * AUTOSAR-inspired Watchdog + Circuit Breaker per software component.
 * A hung/failed module trips OPEN and is isolated from the rest.
 */

export type HealthState = 'OK' | 'DEGRADED' | 'FAILED' | 'TIMEOUT' | 'DISABLED' | 'OPEN';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface ModuleWatch {
  id: string;
  health: HealthState;
  circuit: CircuitState;
  failures: number;
  successes: number;
  consecutiveFailures: number;
  lastError?: string;
  lastSuccessAt?: number;
  lastFailureAt?: number;
  lastDurationMs?: number;
  openedAt?: number;
}

export interface WatchdogConfig {
  /** Failures before circuit opens. */
  failureThreshold: number;
  /** ms to wait before HALF_OPEN probe. */
  openMs: number;
  /** Default op timeout ms. */
  defaultTimeoutMs: number;
  /** Max ops tracked. */
  maxHistory: number;
}

const DEFAULT_CFG: WatchdogConfig = {
  failureThreshold: Number(process.env.XMV_CB_FAILURES) || 3,
  openMs: Number(process.env.XMV_CB_OPEN_MS) || 30_000,
  defaultTimeoutMs: Number(process.env.XMV_MODULE_TIMEOUT_MS) || 15_000,
  maxHistory: 20,
};

const watches = new Map<string, ModuleWatch>();
let cfg = { ...DEFAULT_CFG };

export function configureWatchdog(partial: Partial<WatchdogConfig>): void {
  cfg = { ...cfg, ...partial };
}

export function ensureWatch(id: string): ModuleWatch {
  let w = watches.get(id);
  if (!w) {
    w = {
      id,
      health: 'OK',
      circuit: 'CLOSED',
      failures: 0,
      successes: 0,
      consecutiveFailures: 0,
    };
    watches.set(id, w);
  }
  return w;
}

function transitionCircuit(w: ModuleWatch): void {
  const now = Date.now();
  if (w.circuit === 'OPEN' && w.openedAt && now - w.openedAt >= cfg.openMs) {
    w.circuit = 'HALF_OPEN';
    w.health = 'DEGRADED';
  }
}

export function isCircuitAvailable(id: string): boolean {
  const w = ensureWatch(id);
  transitionCircuit(w);
  return w.circuit !== 'OPEN';
}

export function recordSuccess(id: string, durationMs?: number): void {
  const w = ensureWatch(id);
  w.successes += 1;
  w.consecutiveFailures = 0;
  w.lastSuccessAt = Date.now();
  w.lastDurationMs = durationMs;
  if (w.circuit === 'HALF_OPEN' || w.circuit === 'OPEN') {
    w.circuit = 'CLOSED';
    w.health = 'OK';
    w.openedAt = undefined;
  } else {
    w.health = 'OK';
  }
}

export function recordFailure(
  id: string,
  err: unknown,
  kind: 'FAILED' | 'TIMEOUT' = 'FAILED',
): void {
  const w = ensureWatch(id);
  w.failures += 1;
  w.consecutiveFailures += 1;
  w.lastFailureAt = Date.now();
  w.lastError = err instanceof Error ? err.message : String(err);
  w.health = kind;

  if (w.consecutiveFailures >= cfg.failureThreshold || w.circuit === 'HALF_OPEN') {
    w.circuit = 'OPEN';
    w.health = 'OPEN';
    w.openedAt = Date.now();
  }
}

export function markDisabled(id: string): void {
  const w = ensureWatch(id);
  w.health = 'DISABLED';
  w.circuit = 'OPEN';
  w.openedAt = Date.now();
}

export function resetWatch(id: string): void {
  watches.set(id, {
    id,
    health: 'OK',
    circuit: 'CLOSED',
    failures: 0,
    successes: 0,
    consecutiveFailures: 0,
  });
}

export function getWatch(id: string): ModuleWatch {
  return { ...ensureWatch(id) };
}

export function listWatches(): ModuleWatch[] {
  for (const w of watches.values()) transitionCircuit(w);
  return [...watches.values()].map((w) => ({ ...w }));
}

export function getWatchdogConfig(): WatchdogConfig {
  return { ...cfg };
}

/**
 * Run fn with timeout + circuit breaker isolation.
 * Throws if circuit OPEN or timeout.
 */
export async function guardedRun<T>(
  moduleId: string,
  fn: () => Promise<T> | T,
  timeoutMs?: number,
): Promise<T> {
  const w = ensureWatch(moduleId);
  transitionCircuit(w);

  if (w.circuit === 'OPEN') {
    const err = new Error(`Module "${moduleId}" circuit OPEN — isolated (try later)`);
    (err as any).code = 'MODULE_ISOLATED';
    throw err;
  }

  const ms = timeoutMs ?? cfg.defaultTimeoutMs;
  const start = Date.now();

  try {
    const result = await Promise.race([
      Promise.resolve().then(() => fn()),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          const e = new Error(`Module "${moduleId}" timeout after ${ms}ms`);
          (e as any).code = 'MODULE_TIMEOUT';
          reject(e);
        }, ms);
      }),
    ]);
    recordSuccess(moduleId, Date.now() - start);
    return result;
  } catch (err: any) {
    const kind = err?.code === 'MODULE_TIMEOUT' ? 'TIMEOUT' : 'FAILED';
    recordFailure(moduleId, err, kind);
    throw err;
  }
}
