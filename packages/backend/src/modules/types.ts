import type { Router } from 'express';
import type { FeatureId } from '../config/features';

/**
 * Pluggable feature module — mount routes only when enabled.
 */
export interface FeatureModule {
  /** Matches FeatureId when gated; unique otherwise. */
  id: FeatureId | string;
  name: string;
  description?: string;
  /** Feature flag key; omit = always mount. */
  feature?: FeatureId;
  /** Build router (lazy). */
  createRouter: () => Router;
  /** Optional boot hook. */
  onInit?: () => void;
}

export interface ModuleStatus {
  id: string;
  name: string;
  feature?: FeatureId;
  enabled: boolean;
  mounted: boolean;
  /** Watchdog health (AUTOSAR-inspired isolation). */
  health?: string;
  circuit?: string;
  runnable?: boolean;
}
