import type { FeatureModule } from '../types';
import createRouter from './routes';

export const rpgModule: FeatureModule = {
  id: 'rpg',
  name: 'RPG systems',
  description: 'Inventory, relationships, dice',
  feature: 'rpg',
  createRouter: () => createRouter,
};

export * from './service';
