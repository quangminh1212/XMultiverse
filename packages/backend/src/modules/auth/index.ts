import type { FeatureModule } from '../types';
import createAuthRouter from './routes';

export const authModule: FeatureModule = {
  id: 'auth',
  name: 'Auth',
  description: 'Local username/password + bearer token',
  feature: 'auth',
  createRouter: () => createAuthRouter,
};

export * from './service';
