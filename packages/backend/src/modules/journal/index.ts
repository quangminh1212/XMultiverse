import type { FeatureModule } from '../types';
import createRouter from './routes';

export const journalModule: FeatureModule = {
  id: 'journal',
  name: 'Journal',
  description: 'Exploration journal + discovery',
  feature: 'journal',
  createRouter: () => createRouter,
};

export * from './service';
