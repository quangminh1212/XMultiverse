// Game HTTP surface: mounts domain routes (feature-gated inside).
// Domain logic: modules/<name>/service.ts
import type { FeatureModule } from '../types';
import gameRouter from '../../routes/api';

export const gameModule: FeatureModule = {
  id: 'game',
  name: 'Game API',
  description: 'World, travel, roleplay, quest, journal, RPG, save routes',
  createRouter: () => gameRouter,
};
