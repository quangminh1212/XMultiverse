import { v4 as uuidv4 } from 'uuid';
import {
  saveMarketPack,
  listMarketPacks,
  getMarketPack,
  bumpMarketDownload,
  searchMarketPacks,
  getWorld,
  type MarketPackRow,
} from '../../platform/repository';
import { exportWorldPack, importWorldPack } from '../../platform/player-state';
import type { WorldPack } from '../../platform/types';

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

export function publishWorldToMarket(input: {
  worldId: string;
  author: string;
  title?: string;
  description?: string;
  tags?: string[];
}): Omit<MarketPackRow, 'data'> {
  const world = getWorld(input.worldId);
  if (!world) throw new Error('World not found');
  const pack = exportWorldPack(world);
  const baseSlug = slugify(input.title || world.name) || 'world';
  const slug = `${baseSlug}-${Date.now().toString(36)}`;
  const row: MarketPackRow = {
    id: uuidv4(),
    slug,
    title: (input.title || world.name).slice(0, 120),
    author: input.author.slice(0, 64),
    description: (input.description || world.description || '').slice(0, 500),
    tags: (input.tags || [world.sourceType || 'story', world.scale || 'standard']).slice(0, 8),
    downloads: 0,
    data: JSON.stringify(pack),
    createdAt: Date.now(),
  };
  saveMarketPack(row);
  const { data: _d, ...meta } = row;
  return meta;
}

export function browseMarket(q?: string) {
  if (q?.trim()) return searchMarketPacks(q.trim());
  return listMarketPacks();
}

export function getMarketListing(idOrSlug: string) {
  const pack = getMarketPack(idOrSlug);
  if (!pack) return null;
  const { data: _d, ...meta } = pack;
  return meta;
}

export function installMarketPack(idOrSlug: string) {
  const pack = getMarketPack(idOrSlug);
  if (!pack) throw new Error('Pack not found');
  const worldPack = JSON.parse(pack.data) as WorldPack;
  const world = importWorldPack(worldPack);
  bumpMarketDownload(pack.id);
  return world;
}
