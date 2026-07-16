/**
 * Feature module registry — compose open-world platform from modules.
 */
import { Router } from 'express';
import { isFeatureEnabled, listFeatures, FEATURE_CATALOG } from '../config/features';
import { listScales, defaultScaleId } from '../config/world-scale';
import type { FeatureModule, ModuleStatus } from './types';
import { metaModule } from './meta';
import { gameModule } from './game';

/** Ordered HTTP modules (meta first). */
const HTTP_MODULES: FeatureModule[] = [metaModule, gameModule];

/** Domain service modules (importable for extension). */
export const SERVICE_MODULES = [
  { id: 'world' as const, name: 'World building', path: 'modules/world/service' },
  { id: 'travel' as const, name: 'Travel & map', path: 'modules/travel/service' },
  { id: 'roleplay' as const, name: 'Roleplay GM', path: 'modules/roleplay/service' },
  { id: 'quest' as const, name: 'Quests', path: 'modules/quest/service' },
  { id: 'journal' as const, name: 'Journal', path: 'modules/journal/service' },
  { id: 'rpg' as const, name: 'RPG systems', path: 'modules/rpg/service' },
  { id: 'save' as const, name: 'Save/load', path: 'modules/save/service' },
];

export function listModules(): ModuleStatus[] {
  return [
    ...HTTP_MODULES.map((m) => {
      const gated = m.feature ? isFeatureEnabled(m.feature) : true;
      return {
        id: m.id,
        name: m.name,
        feature: m.feature,
        enabled: gated,
        mounted: gated,
      };
    }),
    ...SERVICE_MODULES.map((s) => ({
      id: s.id,
      name: s.name,
      feature: s.id as any,
      enabled: isFeatureEnabled(s.id as any),
      mounted: true,
    })),
  ];
}

export function createApiRouter(): Router {
  const root = Router();

  root.get('/config/modules', (_req, res) => {
    res.json({
      defaultScale: defaultScaleId(),
      modules: listModules(),
      features: listFeatures(),
      catalog: FEATURE_CATALOG.map((f) => f.id),
      scales: listScales().map((s) => s.id),
      services: SERVICE_MODULES,
    });
  });

  for (const mod of HTTP_MODULES) {
    if (mod.feature && !isFeatureEnabled(mod.feature)) continue;
    mod.onInit?.();
    root.use(mod.createRouter());
  }
  return root;
}

export const MODULES = HTTP_MODULES;
