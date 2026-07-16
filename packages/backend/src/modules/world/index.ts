import type { FeatureModule } from '../types';
import createRouter from './routes';

export const worldModule: FeatureModule = {
  id: 'world',
  name: 'World building',
  description: 'Create/list/export/import worlds, timeline events',
  feature: 'world',
  createRouter: () => createRouter,
};

export * from './service';
