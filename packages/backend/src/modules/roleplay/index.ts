import type { FeatureModule } from '../types';
import createRouter from './routes';

export const roleplayModule: FeatureModule = {
  id: 'roleplay',
  name: 'Roleplay GM',
  description: 'Act / history',
  feature: 'roleplay',
  createRouter: () => createRouter,
};

export * from './service';
