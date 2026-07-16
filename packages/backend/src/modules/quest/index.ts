import type { FeatureModule } from '../types';
import createRouter from './routes';

export const questModule: FeatureModule = {
  id: 'quest',
  name: 'Quests',
  description: 'Quest log',
  feature: 'quest',
  createRouter: () => createRouter,
};

export * from './service';
