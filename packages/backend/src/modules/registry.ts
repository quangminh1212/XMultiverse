/**
 * SWC registry — each module is a separate folder under modules/
 * with its own routes.ts + service.ts (AUTOSAR-style layout).
 */
import { Router } from 'express';
import { isFeatureEnabled, listFeatures, FEATURE_CATALOG } from '../config/features';
import { listScales, defaultScaleId } from '../config/world-scale';
import type { FeatureModule, ModuleStatus } from './types';
import { isolateRouter, rte, isModuleRunnable } from './runtime';
import { info, warn } from '../platform/logger';

import { runtimeModule } from './runtime/module';
import { metaModule } from './meta';
import { worldModule } from './world';
import { playerModule } from './player';
import { roleplayModule } from './roleplay';
import { travelModule } from './travel';
import { questModule } from './quest';
import { journalModule } from './journal';
import { rpgModule } from './rpg';
import { saveModule } from './save';
import { authModule } from './auth';
import { multiplayerModule } from './multiplayer';
import { marketplaceModule } from './marketplace';
import { streamingModule } from './streaming';

/** One entry = one isolated software component. */
const HTTP_MODULES: FeatureModule[] = [
  runtimeModule,
  metaModule,
  worldModule,
  playerModule,
  roleplayModule,
  travelModule,
  questModule,
  journalModule,
  rpgModule,
  saveModule,
  authModule,
  multiplayerModule,
  marketplaceModule,
  streamingModule,
];

export const SERVICE_MODULES = HTTP_MODULES.filter((m) => m.id !== 'runtime' && m.id !== 'meta').map(
  (m) => ({
    id: m.id,
    name: m.name,
    path: `modules/${m.id}`,
  }),
);

export function listModules(): ModuleStatus[] {
  const health = rte.health().modules;
  return HTTP_MODULES.map((m) => {
    const gated = m.feature ? isFeatureEnabled(m.feature) : true;
    const h = health.find((x) => x.id === m.id);
    return {
      id: m.id,
      name: m.name,
      feature: m.feature,
      enabled: gated,
      mounted: gated && isModuleRunnable(m.id),
      health: h?.health,
      circuit: h?.circuit,
      runnable: isModuleRunnable(m.id),
    };
  });
}

export function createApiRouter(): Router {
  const root = Router();

  root.get('/config/modules', (_req, res) => {
    res.json({
      architecture: 'autosar-swc-folder-layout',
      layout: 'src/modules/<swc>/{index,routes,service}.ts + src/platform/*',
      defaultScale: defaultScaleId(),
      mode: rte.getMode(),
      modules: listModules(),
      features: listFeatures(),
      catalog: FEATURE_CATALOG.map((f) => f.id),
      scales: listScales().map((s) => s.id),
      services: SERVICE_MODULES,
      runtime: rte.health(),
    });
  });

  for (const mod of HTTP_MODULES) {
    if (mod.feature && !isFeatureEnabled(mod.feature)) {
      info('registry', `skip disabled: ${mod.id}`);
      continue;
    }
    try {
      mod.onInit?.();
      const raw = mod.createRouter();
      root.use(isolateRouter(mod.id, raw));
      info('registry', `mounted SWC modules/${mod.id}/`);
    } catch (err: any) {
      warn('registry', `SWC ${mod.id} mount failed: ${err.message}`);
      try {
        rte.disableModule(mod.id);
      } catch {
        /* ignore */
      }
    }
  }
  return root;
}

export const MODULES = HTTP_MODULES;
