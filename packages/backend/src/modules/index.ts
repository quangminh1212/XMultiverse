/**
 * Modular SWC layout (AUTOSAR-inspired):
 *
 *   src/platform/     — shared BSW (db, logger, dice, worldgen engine, middleware)
 *   src/modules/<id>/ — one folder per software component
 *        index.ts     — FeatureModule registration
 *        routes.ts    — HTTP ports
 *        service.ts   — public API for other modules / tools
 *   src/config/       — scale, features, limits
 *   src/modules/runtime/ — RTE, modes, watchdog, isolation
 */
export { createApiRouter, listModules, MODULES, SERVICE_MODULES } from './registry';
export type { FeatureModule, ModuleStatus } from './types';
export { rte, isModuleRunnable, isolateRouter } from './runtime';

export * as world from './world';
export * as player from './player';
export * as roleplay from './roleplay';
export * as travel from './travel';
export * as quest from './quest';
export * as journal from './journal';
export * as rpg from './rpg';
export * as save from './save';
export * as auth from './auth';
export * as multiplayer from './multiplayer';
export * as marketplace from './marketplace';
export * as streaming from './streaming';
