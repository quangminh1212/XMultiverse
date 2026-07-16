/**
 * Shared player state helpers: discovery, journal, autosave.
 */
import { v4 as uuidv4 } from 'uuid';
import type { JournalEntry, Player, World, WorldPack, Location } from '../types';
import {
  savePlayer,
  saveWorld,
  getChatHistory,
  saveSnapshot,
  listSnapshotsByPlayer,
  deleteSnapshot,
} from './repository';
import { findLocation } from './worldgen';

const JOURNAL_MAX = 40;

export function ensurePlayerArrays(player: Player): void {
  if (!player.visitedLocations) player.visitedLocations = [];
  if (!player.journal) player.journal = [];
  if (!player.questLog) player.questLog = [];
  if (!player.relationships) player.relationships = {};
  if (!player.sceneSummaries) player.sceneSummaries = [];
  if (!player.inventory) player.inventory = [];
}

export function markVisited(player: Player, locationId?: string): boolean {
  ensurePlayerArrays(player);
  if (!locationId) return false;
  if (player.visitedLocations.includes(locationId)) return false;
  player.visitedLocations.push(locationId);
  return true;
}

export function appendJournal(
  player: Player,
  text: string,
  source: JournalEntry['source'],
  world?: World,
): JournalEntry {
  ensurePlayerArrays(player);
  const loc =
    player.currentLocationId && world ? findLocation(world, player.currentLocationId) : undefined;
  const entry: JournalEntry = {
    id: uuidv4(),
    at: Date.now(),
    locationId: loc?.id || player.currentLocationId,
    locationName: loc?.name,
    text: text.slice(0, 500),
    source,
  };
  player.journal.push(entry);
  if (player.journal.length > JOURNAL_MAX) {
    player.journal = player.journal.slice(-JOURNAL_MAX);
  }
  return entry;
}

export function discoveryProgress(
  player: Player,
  world: World,
): {
  visited: number;
  total: number;
  percent: number;
} {
  ensurePlayerArrays(player);
  const total = world.locations?.length || 0;
  const visited = player.visitedLocations.filter((id) =>
    (world.locations || []).some((l) => l.id === id),
  ).length;
  return {
    visited,
    total,
    percent: total === 0 ? 0 : Math.round((visited / total) * 100),
  };
}

/** Keep a single rolling autosave named "Autosave" per player. */
export function writeAutosave(player: Player, world: World): void {
  const existing = listSnapshotsByPlayer(player.id).filter((s) => s.name === 'Autosave');
  for (const s of existing) deleteSnapshot(s.id);
  saveSnapshot({
    id: uuidv4(),
    name: 'Autosave',
    worldId: world.id,
    playerId: player.id,
    createdAt: Date.now(),
    worldData: world,
    playerData: player,
    chatHistory: getChatHistory(player.id, 100),
  });
}

export function exportWorldPack(world: World): WorldPack {
  return {
    format: 'xmultiverse-world-v1',
    exportedAt: Date.now(),
    version: '1.1.0',
    world,
  };
}

/** Clone a world pack with fresh IDs so imports never collide. */
export function importWorldPack(pack: WorldPack | { world: World }): World {
  const src = 'world' in pack ? pack.world : (pack as unknown as World);
  if (!src || !src.name) {
    throw new Error('Invalid world pack: missing world data');
  }

  const idMap = new Map<string, string>();
  const mapId = (old?: string) => {
    if (!old) return uuidv4();
    if (!idMap.has(old)) idMap.set(old, uuidv4());
    return idMap.get(old)!;
  };

  const locations: Location[] = (src.locations || []).map((l) => ({
    ...l,
    id: mapId(l.id),
    connections: [...(l.connections || [])],
    npcs: [...(l.npcs || [])],
    tags: l.tags ? [...l.tags] : undefined,
  }));

  const world: World = {
    id: uuidv4(),
    storyInput: src.storyInput || '',
    name: src.name,
    description: src.description || '',
    geography: [...(src.geography || locations.map((l) => l.name))],
    locations,
    factions: (src.factions || []).map((f) => ({
      ...f,
      goals: [...(f.goals || [])],
    })),
    magicSystem: src.magicSystem,
    technologyLevel: src.technologyLevel,
    timeline: (src.timeline || []).map((e) => ({
      ...e,
      id: mapId(e.id),
    })),
    characters: (src.characters || []).map((c) => ({
      ...c,
      id: mapId(c.id),
    })),
    quests: (src.quests || []).map((q) => ({
      ...q,
      id: mapId(q.id),
    })),
    sourceType: src.sourceType || 'story',
    createdAt: Date.now(),
  };

  saveWorld(world);
  return world;
}

export function persistPlayer(player: Player): void {
  ensurePlayerArrays(player);
  savePlayer(player);
}
