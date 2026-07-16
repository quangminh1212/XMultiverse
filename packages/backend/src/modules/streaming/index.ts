import type { FeatureModule } from '../types';
import createRouter from './routes';

export const streamingModule: FeatureModule = {
  id: 'streaming',
  name: 'Streaming roleplay',
  description: 'SSE token stream for act',
  feature: 'streaming',
  createRouter: () => createRouter,
};

export * from './service';
