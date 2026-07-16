import type { FeatureModule } from '../types';
import createRouter from './routes';

export const saveModule: FeatureModule = {
  id: 'save',
  name: 'Save / load',
  description: 'Snapshots',
  feature: 'save',
  createRouter: () => createRouter,
};

export * from './service';
