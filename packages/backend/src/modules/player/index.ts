import type { FeatureModule } from '../types';
import createRouter from './routes';

export const playerModule: FeatureModule = {
  id: 'player',
  name: 'Players',
  description: 'Player CRUD inside worlds',
  feature: 'player',
  createRouter: () => createRouter,
};
