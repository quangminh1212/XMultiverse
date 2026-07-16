import type { FeatureModule } from '../types';
import createMetaRouter from './routes';

export const metaModule: FeatureModule = {
  id: 'meta',
  name: 'Platform config',
  description: 'Scales, feature flags, module status',
  createRouter: () => createMetaRouter,
};
