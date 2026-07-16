import type { FeatureModule } from '../types';
import createRouter from './routes';
import { rte } from './rte';

export const runtimeModule: FeatureModule = {
  id: 'runtime',
  name: 'RTE / Isolation runtime',
  description: 'AUTOSAR-inspired modes, watchdog, circuit breakers',
  createRouter: () => createRouter,
  onInit: () => {
    // Register core SWCs for health map
    const swcs = [
      { id: 'meta', name: 'Meta config', critical: true },
      { id: 'game', name: 'Game core HTTP', critical: true },
      { id: 'world', name: 'World building', critical: true },
      { id: 'player', name: 'Players', critical: true },
      { id: 'roleplay', name: 'Roleplay GM', critical: true },
      { id: 'travel', name: 'Travel map' },
      { id: 'quest', name: 'Quests' },
      { id: 'journal', name: 'Journal' },
      { id: 'rpg', name: 'RPG systems' },
      { id: 'save', name: 'Save/load' },
      { id: 'auth', name: 'Auth', feature: 'auth' as const },
      { id: 'multiplayer', name: 'Multiplayer', feature: 'multiplayer' as const },
      { id: 'marketplace', name: 'Marketplace', feature: 'marketplace' as const },
      { id: 'streaming', name: 'Streaming GM', feature: 'streaming' as const },
    ];
    for (const s of swcs) rte.registerSwc(s);
  },
};
