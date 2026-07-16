/**
 * AUTOSAR-inspired runtime package:
 * - Mode Manager
 * - Watchdog / Circuit Breaker
 * - RTE (Runtime Environment)
 * - HTTP isolation shells
 */
export { rte, isModuleRunnable } from './rte';
export type { SwcDescriptor, ModulePort, PlatformMode, ModuleWatch } from './rte';
export {
  guardedRun,
  recordSuccess,
  recordFailure,
  listWatches,
  getWatch,
  resetWatch,
  configureWatchdog,
  isCircuitAvailable,
} from './watchdog';
export { getMode, setMode, listModes, modeStatus, PLATFORM_MODES, enterDegraded } from './modes';
export { isolateRouter, requireSwc, isolatedHandler } from './isolation';
