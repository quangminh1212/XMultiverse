import type { FeatureModule } from '../types';
import createRouter from './routes';

export const marketplaceModule: FeatureModule = {
  id: 'marketplace',
  name: 'Marketplace',
  description: 'Publish / browse / install world packs',
  feature: 'marketplace',
  createRouter: () => createRouter,
};

export * from './service';
