/**
 * Shared player state helpers — tuned for lightweight open-world play.
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
import { LIMITS } from '../config/limits';

/** In-memory throttle for autosave (per player process). */
const lastAutosaveAt = new Map<string, number>();

export function ensurePlayerArrays(player: Player): void {
  if (!player.visitedLocations) player.visitedLocations = [];
  if (!player.journal) player.journal = [];
  if (!player.questLog) player.questLog = [];
  if (!player.relationships) player.relationships = {};
  if (!player.sceneSummaries) player.sceneSummaries = [];
  if (!player.inventory) player.inventory = [];
}

/** Trim player-side arrays to hard caps (call after mutations). */
export function trimPlayer(player: Player): void {
  ensurePlayerArrays(player);
  if (player.journal.length > LIMITS.journalMax) {
    player.journal = player.journal.slice(-LIMITS.journalMax);
  }
  if (player.sceneSummaries.length > LIMITS.sceneSummariesMax) {
    player.sceneSummaries = player.sceneSummaries.slice(-LIMITS.sceneSummariesMax);
  }
  if (player.inventory.length > LIMITS.inventoryMax) {
    player.inventory = player.inventory.slice(-LIMITS.inventoryMax);
  }
  if (player.questLog.length > LIMITS.questLogMax) {
    player.questLog = player.questLog.slice(0, LIMITS.questLogMax);
  }
  for (const key of Object.keys(player.relationships)) {
    const rel = player.relationships[key];
    if (rel.notes && rel.notes.length > LIMITS.relationshipNotesMax) {
      rel.notes = rel.notes.slice(-LIMITS.relationshipNotesMax);
    }
  }
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
    text: text.slice(0, LIMITS.journalTextMax),
    source,
  };
  player.journal.push(entry);
  if (player.journal.length > LIMITS.journalMax) {
    player.journal = player.journal.slice(-LIMITS.journalMax);
  }
  return entry;
}

export function pushSceneSummary(player: Player, scene: string): void {
  ensurePlayerArrays(player);
  player.sceneSummaries.push(scene.slice(0, LIMITS.sceneSummaryLen));
  if (player.sceneSummaries.length > LIMITS.sceneSummariesMax) {
    player.sceneSummaries = player.sceneSummaries.slice(-LIMITS.sceneSummariesMax);
  }
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

/**
 * Lightweight rolling autosave.
 * - Opt-in only (caller checks)
 * - Throttled by interval
 * - Short chat window (not full history)
 */
export function writeAutosave(player: Player, world: World, force = false): boolean {
  const now = Date.now();
  const prev = lastAutosaveAt.get(player.id) || 0;
  if (!force && now - prev < LIMITS.autosaveMinIntervalMs) {
    return false;
  }
  lastAutosaveAt.set(player.id, now);

  const existing = listSnapshotsByPlayer(player.id).filter((s) => s.name === 'Autosave');
  for (const s of existing) deleteSnapshot(s.id);

  // Shallow-copy without bloating: store world as-is (already capped), short chat
  saveSnapshot({
    id: uuidv4(),
    name: 'Autosave',
    worldId: world.id,
    playerId: player.id,
    createdAt: now,
    worldData: world,
    playerData: player,
    chatHistory: getChatHistory(player.id, LIMITS.autosaveChat),
  });
  return true;
}

export function exportWorldPack(world: World): WorldPack {
  return {
    format: 'xmultiverse-world-v1',
    exportedAt: Date.now(),
    version: '1.1.0',
    world: slimWorld(world),
  };
}

/** Cap world collections so open-world data stays small. */
export function slimWorld(world: World): World {
  const locations = (world.locations || []).slice(0, LIMITS.locationsMax);
  return {
    ...world,
    storyInput: (world.storyInput || '').slice(0, LIMITS.storyInputMax),
    description: (world.description || '').slice(0, LIMITS.descriptionMax),
    geography: (world.geography || locations.map((l) => l.name)).slice(0, LIMITS.locationsMax),
    locations: locations.map((l) => ({
      ...l,
      description: (l.description || '').slice(0, 280),
      connections: (l.connections || []).slice(0, 4),
      npcs: (l.npcs || []).slice(0, 3),
      tags: l.tags?.slice(0, 4),
    })),
    factions: (world.factions || []).slice(0, LIMITS.factionsMax).map((f) => ({
      ...f,
      description: (f.description || '').slice(0, 200),
      goals: (f.goals || []).slice(0, 3),
    })),
    timeline: (world.timeline || []).slice(0, LIMITS.timelineMax),
    characters: (world.characters || []).slice(0, LIMITS.charactersMax).map((c) => ({
      ...c,
      description: (c.description || '').slice(0, 160),
    })),
    quests: (world.quests || []).slice(0, LIMITS.questsMax).map((q) => ({
      ...q,
      description: (q.description || '').slice(0, 200),
      objective: (q.objective || '').slice(0, 120),
    })),
  };
}

export function capTimeline(world: World): void {
  if (world.timeline && world.timeline.length > LIMITS.timelineMax) {
    // Keep earliest lore + latest player events
    const sorted = [...world.timeline].sort((a, b) => a.year - b.year);
    const keepHead = Math.floor(LIMITS.timelineMax / 2);
    const keepTail = LIMITS.timelineMax - keepHead;
    world.timeline = [...sorted.slice(0, keepHead), ...sorted.slice(-keepTail)];
    world.timeline.sort((a, b) => a.year - b.year);
  }
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

  const locations: Location[] = (src.locations || []).slice(0, LIMITS.locationsMax).map((l) => ({
    ...l,
    id: mapId(l.id),
    description: (l.description || '').slice(0, 280),
    connections: [...(l.connections || [])].slice(0, 4),
    npcs: [...(l.npcs || [])].slice(0, 3),
    tags: l.tags ? [...l.tags].slice(0, 4) : undefined,
  }));

  const world = slimWorld({
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
  });

  saveWorld(world);
  return world;
}

export function persistPlayer(player: Player): void {
  trimPlayer(player);
  savePlayer(player);
}
