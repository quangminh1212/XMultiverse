import type { FeatureModule } from '../types';
import createRouter from './routes';

export const multiplayerModule: FeatureModule = {
  id: 'multiplayer',
  name: 'Multiplayer',
  description: 'Share codes + presence for co-op worlds',
  feature: 'multiplayer',
  createRouter: () => createRouter,
};

export * from './service';
