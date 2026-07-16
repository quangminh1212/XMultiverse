import type { FeatureModule } from '../types';
import createRouter from './routes';

export const travelModule: FeatureModule = {
  id: 'travel',
  name: 'Travel & map',
  description: 'Locations graph and travel',
  feature: 'travel',
  createRouter: () => createRouter,
};

export * from './service';
