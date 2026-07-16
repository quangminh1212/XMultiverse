/**
 * Feature module registry — compose open-world platform from modules.
 */
import { Router } from 'express';
import { isFeatureEnabled, listFeatures } from '../config/features';
import { listScales, defaultScaleId } from '../config/world-scale';
import type { FeatureModule, ModuleStatus } from './types';
import { metaModule } from './meta';
import { gameModule } from './game';

/** Ordered module list (meta first for /config). */
const MODULES: FeatureModule[] = [metaModule, gameModule];

/** Service-layer modules (for tooling / docs / future route splits). */
export const SERVICE_MODULES = [
  { id: 'world', path: './world/service' },
  { id: 'travel', path: './travel/service' },
  { id: 'roleplay', path: './roleplay/service' },
  { id: 'quest', path: './quest/service' },
  { id: 'journal', path: './journal/service' },
  { id: 'rpg', path: './rpg/service' },
  { id: 'save', path: './save/service' },
] as const;

export function listModules(): ModuleStatus[] {
  return [
    ...MODULES.map((m) => {
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
      name: `service:${s.id}`,
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
      scales: listScales().map((s) => s.id),
    });
  });

  for (const mod of MODULES) {
    if (mod.feature && !isFeatureEnabled(mod.feature)) continue;
    mod.onInit?.();
    root.use(mod.createRouter());
  }
  return root;
}

export { MODULES };
