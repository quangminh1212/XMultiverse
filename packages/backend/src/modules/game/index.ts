// Game HTTP surface: domain routes (feature-gated per endpoint).
// Domain services: modules/<name>/service.ts
import type { FeatureModule } from '../types';
import gameRouter from './routes';

export const gameModule: FeatureModule = {
  id: 'game',
  name: 'Game API',
  description: 'World, travel, roleplay, quest, journal, RPG, save routes',
  createRouter: () => gameRouter,
};
