/**
 * RTE — Runtime Environment (AUTOSAR-inspired).
 *
 * All cross-module / risky operations should go through `rte.invoke`
 * so failures and hangs stay inside the calling software component.
 */

import { EventEmitter } from 'events';
import {
  guardedRun,
  isCircuitAvailable,
  listWatches,
  getWatch,
  resetWatch,
  markDisabled,
  getWatchdogConfig,
  type ModuleWatch,
} from './watchdog';
import {
  getMode,
  setMode,
  enterDegraded,
  isModuleAllowedInMode,
  modeStatus,
  listModes,
  type PlatformMode,
} from './modes';
import { isFeatureEnabled, type FeatureId } from '../../config/features';
import { info, warn, error as logError } from '../../services/logger';

export type PortKind = 'PPort' | 'RPort'; // Provide / Require (AUTOSAR naming)

export interface ModulePort {
  name: string;
  kind: PortKind;
  /** Interface contract id */
  interfaceId: string;
}

export interface SwcDescriptor {
  id: string;
  name: string;
  /** Optional feature flag */
  feature?: FeatureId | string;
  /** Critical SWC — failure may force safe/core mode */
  critical?: boolean;
  ports?: ModulePort[];
}

const bus = new EventEmitter();
const swcs = new Map<string, SwcDescriptor>();

export const rte = {
  /** Register a software component descriptor (for health map). */
  registerSwc(desc: SwcDescriptor): void {
    swcs.set(desc.id, desc);
    getWatch(desc.id); // ensure watchdog entry
    info('rte', `SWC registered: ${desc.id}`);
  },

  listSwcs(): SwcDescriptor[] {
    return [...swcs.values()];
  },

  /**
   * Isolated invoke — timeout + circuit breaker.
   * Other modules keep running if this one fails.
   */
  async invoke<T>(
    moduleId: string,
    operation: string,
    fn: () => Promise<T> | T,
    opts?: { timeoutMs?: number },
  ): Promise<T> {
    if (!isModuleRunnable(moduleId)) {
      const err = new Error(`SWC "${moduleId}" not runnable in mode=${getMode()}`);
      (err as any).code = 'MODULE_NOT_RUNNABLE';
      throw err;
    }

    info('rte', `invoke ${moduleId}.${operation}`);
    try {
      const result = await guardedRun(moduleId, fn, opts?.timeoutMs);
      bus.emit('invoke:ok', { moduleId, operation });
      return result;
    } catch (err: any) {
      warn('rte', `invoke fail ${moduleId}.${operation}: ${err.message}`);
      bus.emit('invoke:fail', { moduleId, operation, err: err.message });

      const desc = swcs.get(moduleId);
      // Non-critical: enter degraded so remaining modules stay up
      if (!desc?.critical && (err.code === 'MODULE_TIMEOUT' || err.code === 'MODULE_ISOLATED')) {
        enterDegraded(`swc ${moduleId} ${err.code}`);
      }
      // Critical repeated OPEN → safe mode
      if (desc?.critical && getWatch(moduleId).circuit === 'OPEN') {
        setMode('safe', `critical SWC ${moduleId} open`);
      }
      throw err;
    }
  },

  /** Fire-and-forget event between modules (no throw to caller). */
  publish(event: string, payload?: unknown): void {
    try {
      bus.emit(event, payload);
    } catch (e: any) {
      logError('rte', `event ${event} handler error: ${e.message}`);
    }
  },

  subscribe(event: string, handler: (payload: any) => void): () => void {
    const wrapped = (payload: any) => {
      try {
        handler(payload);
      } catch (e: any) {
        logError('rte', `subscriber ${event}: ${e.message}`);
      }
    };
    bus.on(event, wrapped);
    return () => bus.off(event, wrapped);
  },

  health(): {
    mode: ReturnType<typeof modeStatus>;
    watchdog: ReturnType<typeof getWatchdogConfig>;
    modules: Array<ModuleWatch & { runnable: boolean; swc?: SwcDescriptor }>;
  } {
    return {
      mode: modeStatus(),
      watchdog: getWatchdogConfig(),
      modules: listWatches().map((w) => ({
        ...w,
        runnable: isModuleRunnable(w.id),
        swc: swcs.get(w.id),
      })),
    };
  },

  resetModule(id: string): void {
    resetWatch(id);
    info('rte', `reset SWC ${id}`);
  },

  disableModule(id: string): void {
    markDisabled(id);
    info('rte', `disabled SWC ${id}`);
  },

  setMode(mode: PlatformMode, reason?: string): void {
    setMode(mode, reason);
  },

  getMode,
  listModes,
};

/** Combined gate: feature flag + mode + circuit. */
export function isModuleRunnable(moduleId: string): boolean {
  if (!isModuleAllowedInMode(moduleId)) return false;
  // feature flags for known FeatureIds
  try {
    if (!isFeatureEnabled(moduleId as FeatureId) && moduleId !== 'meta' && moduleId !== 'game') {
      // not every moduleId is a FeatureId — only check if known
      const known = [
        'world',
        'travel',
        'roleplay',
        'player',
        'quest',
        'journal',
        'rpg',
        'save',
        'auth',
        'multiplayer',
        'marketplace',
        'streaming',
        'discovery',
        'timeline',
        'relationships',
      ];
      if (known.includes(moduleId) && !isFeatureEnabled(moduleId as FeatureId)) return false;
    }
  } catch {
    /* ignore */
  }
  return isCircuitAvailable(moduleId);
}

export type { PlatformMode, ModuleWatch };
