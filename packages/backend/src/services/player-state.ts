/**
 * Player state helpers — scale-aware caps for real open worlds.
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
import { getLimits, type RuntimeLimits } from '../config/limits';

const lastAutosaveAt = new Map<string, number>();

function L(world?: World | string | null): RuntimeLimits {
  if (typeof world === 'string' || world == null) return getLimits(world);
  return getLimits(world.scale);
}

export function ensurePlayerArrays(player: Player): void {
  if (!player.visitedLocations) player.visitedLocations = [];
  if (!player.journal) player.journal = [];
  if (!player.questLog) player.questLog = [];
  if (!player.relationships) player.relationships = {};
  if (!player.sceneSummaries) player.sceneSummaries = [];
  if (!player.inventory) player.inventory = [];
}

export function trimPlayer(player: Player, world?: World): void {
  ensurePlayerArrays(player);
  const lim = L(world);
  if (player.journal.length > lim.journalMax) {
    player.journal = player.journal.slice(-lim.journalMax);
  }
  if (player.sceneSummaries.length > lim.sceneSummariesMax) {
    player.sceneSummaries = player.sceneSummaries.slice(-lim.sceneSummariesMax);
  }
  if (player.inventory.length > lim.inventoryMax) {
    player.inventory = player.inventory.slice(-lim.inventoryMax);
  }
  if (player.questLog.length > lim.questLogMax) {
    player.questLog = player.questLog.slice(0, lim.questLogMax);
  }
  for (const key of Object.keys(player.relationships)) {
    const rel = player.relationships[key];
    if (rel.notes && rel.notes.length > lim.relationshipNotesMax) {
      rel.notes = rel.notes.slice(-lim.relationshipNotesMax);
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
  const lim = L(world);
  const loc =
    player.currentLocationId && world ? findLocation(world, player.currentLocationId) : undefined;
  const entry: JournalEntry = {
    id: uuidv4(),
    at: Date.now(),
    locationId: loc?.id || player.currentLocationId,
    locationName: loc?.name,
    text: text.slice(0, lim.journalTextMax),
    source,
  };
  player.journal.push(entry);
  if (player.journal.length > lim.journalMax) {
    player.journal = player.journal.slice(-lim.journalMax);
  }
  return entry;
}

export function pushSceneSummary(player: Player, scene: string, world?: World): void {
  ensurePlayerArrays(player);
  const lim = L(world);
  player.sceneSummaries.push(scene.slice(0, lim.sceneSummaryLen));
  if (player.sceneSummaries.length > lim.sceneSummariesMax) {
    player.sceneSummaries = player.sceneSummaries.slice(-lim.sceneSummariesMax);
  }
}

export function discoveryProgress(
  player: Player,
  world: World,
): { visited: number; total: number; percent: number } {
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

export function writeAutosave(player: Player, world: World, force = false): boolean {
  const lim = L(world);
  const now = Date.now();
  const prev = lastAutosaveAt.get(player.id) || 0;
  if (!force && now - prev < lim.autosaveMinIntervalMs) return false;
  lastAutosaveAt.set(player.id, now);

  for (const s of listSnapshotsByPlayer(player.id).filter((x) => x.name === 'Autosave')) {
    deleteSnapshot(s.id);
  }
  saveSnapshot({
    id: uuidv4(),
    name: 'Autosave',
    worldId: world.id,
    playerId: player.id,
    createdAt: now,
    worldData: world,
    playerData: player,
    chatHistory: getChatHistory(player.id, lim.autosaveChat),
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

export function slimWorld(world: World, scaleHint?: string): World {
  const lim = getLimits(scaleHint || world.scale);
  const connCap = lim.scaleId === 'epic' ? 6 : lim.scaleId === 'expansive' ? 5 : 4;
  const locations = (world.locations || []).slice(0, lim.locationsMax);
  return {
    ...world,
    scale: world.scale || lim.scaleId,
    storyInput: (world.storyInput || '').slice(0, lim.storyInputMax),
    description: (world.description || '').slice(0, lim.descriptionMax),
    geography: (world.geography || locations.map((l) => l.name)).slice(0, lim.locationsMax),
    locations: locations.map((l) => ({
      ...l,
      description: (l.description || '').slice(0, 280),
      connections: (l.connections || []).slice(0, connCap),
      npcs: (l.npcs || []).slice(0, lim.scaleId === 'compact' ? 2 : 3),
      tags: l.tags?.slice(0, 4),
    })),
    factions: (world.factions || []).slice(0, lim.factionsMax).map((f) => ({
      ...f,
      description: (f.description || '').slice(0, 200),
      goals: (f.goals || []).slice(0, 3),
    })),
    timeline: (world.timeline || []).slice(0, lim.timelineMax),
    characters: (world.characters || []).slice(0, lim.charactersMax).map((c) => ({
      ...c,
      description: (c.description || '').slice(0, 160),
    })),
    quests: (world.quests || []).slice(0, lim.questsMax).map((q) => ({
      ...q,
      description: (q.description || '').slice(0, 200),
      objective: (q.objective || '').slice(0, 120),
    })),
  };
}

export function capTimeline(world: World): void {
  const lim = L(world);
  if (world.timeline && world.timeline.length > lim.timelineMax) {
    const sorted = [...world.timeline].sort((a, b) => a.year - b.year);
    const keepHead = Math.floor(lim.timelineMax / 2);
    const keepTail = lim.timelineMax - keepHead;
    world.timeline = [...sorted.slice(0, keepHead), ...sorted.slice(-keepTail)];
    world.timeline.sort((a, b) => a.year - b.year);
  }
}

export function importWorldPack(pack: WorldPack | { world: World }): World {
  const src = 'world' in pack ? pack.world : (pack as unknown as World);
  if (!src || !src.name) throw new Error('Invalid world pack: missing world data');

  const idMap = new Map<string, string>();
  const mapId = (old?: string) => {
    if (!old) return uuidv4();
    if (!idMap.has(old)) idMap.set(old, uuidv4());
    return idMap.get(old)!;
  };

  const lim = getLimits(src.scale);
  const locations: Location[] = (src.locations || []).slice(0, lim.locationsMax).map((l) => ({
    ...l,
    id: mapId(l.id),
    description: (l.description || '').slice(0, 280),
    connections: [...(l.connections || [])].slice(0, 6),
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
    factions: (src.factions || []).map((f) => ({ ...f, goals: [...(f.goals || [])] })),
    magicSystem: src.magicSystem,
    technologyLevel: src.technologyLevel,
    timeline: (src.timeline || []).map((e) => ({ ...e, id: mapId(e.id) })),
    characters: (src.characters || []).map((c) => ({ ...c, id: mapId(c.id) })),
    quests: (src.quests || []).map((q) => ({ ...q, id: mapId(q.id) })),
    sourceType: src.sourceType || 'story',
    scale: src.scale || lim.scaleId,
    createdAt: Date.now(),
  });

  saveWorld(world);
  return world;
}

export function persistPlayer(player: Player, world?: World): void {
  trimPlayer(player, world);
  savePlayer(player);
}
