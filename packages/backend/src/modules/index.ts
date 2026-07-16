/**
 * XMultiverse modular open-world platform.
 *
 * @example
 * import { createApiRouter } from './modules';
 * import * as travel from './modules/travel/service';
 * import { resolveScale } from './config/world-scale';
 */
export { createApiRouter, listModules, MODULES, SERVICE_MODULES } from './registry';
export type { FeatureModule, ModuleStatus } from './types';

export * as worldService from './world/service';
export * as travelService from './travel/service';
export * as roleplayService from './roleplay/service';
export * as questService from './quest/service';
export * as journalService from './journal/service';
export * as rpgService from './rpg/service';
export * as saveService from './save/service';
