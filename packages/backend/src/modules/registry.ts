/**
 * Feature module registry with AUTOSAR-inspired isolation.
 * Each HTTP SWC is mounted behind isolateRouter — faults stay local.
 */
import { Router } from 'express';
import { isFeatureEnabled, listFeatures, FEATURE_CATALOG } from '../config/features';
import { listScales, defaultScaleId } from '../config/world-scale';
import type { FeatureModule, ModuleStatus } from './types';
import { metaModule } from './meta';
import { gameModule } from './game';
import { authModule } from './auth';
import { multiplayerModule } from './multiplayer';
import { marketplaceModule } from './marketplace';
import { streamingModule } from './streaming';
import { runtimeModule } from './runtime/module';
import { isolateRouter, rte, isModuleRunnable } from './runtime';
import { warn, info } from '../services/logger';

/** Ordered HTTP modules — runtime first (health map), meta second. */
const HTTP_MODULES: FeatureModule[] = [
  runtimeModule,
  metaModule,
  authModule,
  multiplayerModule,
  marketplaceModule,
  streamingModule,
  gameModule,
];

export const SERVICE_MODULES = [
  { id: 'world' as const, name: 'World building', path: 'modules/world/service' },
  { id: 'travel' as const, name: 'Travel & map', path: 'modules/travel/service' },
  { id: 'roleplay' as const, name: 'Roleplay GM', path: 'modules/roleplay/service' },
  { id: 'quest' as const, name: 'Quests', path: 'modules/quest/service' },
  { id: 'journal' as const, name: 'Journal', path: 'modules/journal/service' },
  { id: 'rpg' as const, name: 'RPG systems', path: 'modules/rpg/service' },
  { id: 'save' as const, name: 'Save/load', path: 'modules/save/service' },
  { id: 'auth' as const, name: 'Auth', path: 'modules/auth/service' },
  { id: 'multiplayer' as const, name: 'Multiplayer', path: 'modules/multiplayer/service' },
  { id: 'marketplace' as const, name: 'Marketplace', path: 'modules/marketplace/service' },
  { id: 'streaming' as const, name: 'Streaming', path: 'modules/streaming/service' },
  { id: 'runtime' as const, name: 'RTE isolation', path: 'modules/runtime' },
];

export function listModules(): ModuleStatus[] {
  const health = rte.health().modules;
  return [
    ...HTTP_MODULES.map((m) => {
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
    }),
    ...SERVICE_MODULES.map((s) => {
      const h = health.find((x) => x.id === s.id);
      return {
        id: s.id,
        name: s.name,
        feature: s.id as any,
        enabled: isFeatureEnabled(s.id as any),
        mounted: true,
        health: h?.health || 'OK',
        circuit: h?.circuit || 'CLOSED',
        runnable: isModuleRunnable(s.id),
      };
    }),
  ];
}

export function createApiRouter(): Router {
  const root = Router();

  root.get('/config/modules', (_req, res) => {
    res.json({
      architecture: 'autosar-inspired-swc-isolation',
      defaultScale: defaultScaleId(),
      mode: rte.getMode(),
      modules: listModules(),
      features: listFeatures(),
      catalog: FEATURE_CATALOG.map((f) => f.id),
      scales: listScales().map((s) => s.id),
      services: SERVICE_MODULES,
      runtime: rte.health(),
      v2: ['auth', 'multiplayer', 'marketplace', 'streaming', 'pwa', 'rte-isolation'],
    });
  });

  for (const mod of HTTP_MODULES) {
    if (mod.feature && !isFeatureEnabled(mod.feature)) {
      info('registry', `skip disabled feature module: ${mod.id}`);
      continue;
    }
    try {
      mod.onInit?.();
      const raw = mod.createRouter();
      // Isolate every SWC — error/hang in one does not kill siblings
      const isolated = isolateRouter(mod.id, raw);
      root.use(isolated);
      info('registry', `mounted SWC=${mod.id} (isolated)`);
    } catch (err: any) {
      // Mount failure of one module must not block others
      warn('registry', `SWC ${mod.id} failed to mount: ${err.message}`);
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
