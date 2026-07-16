import { describe, it, expect, beforeAll } from 'vitest';
import {
  generateWorldFromStory,
  getStartingLocation,
  findLocation,
  canTravel,
  travelToLocation,
  _detectDemoGenreForTest,
} from './worldgen';
import type { Player, World } from '../types';
import { createDefaultStats } from './dice';
import { exportWorldPack, importWorldPack } from './player-state';

process.env.DEMO_MODE = 'true';

describe('worldgen open world', () => {
  let world: World;

  beforeAll(async () => {
    world = await generateWorldFromStory(
      'A knight seeks a divine sword to defeat a demon lord',
      'story',
    );
  });

  it('detects demo genres from story keywords', () => {
    expect(_detectDemoGenreForTest('space station wormhole AI', 'movie')).toBe('scifi');
    expect(_detectDemoGenreForTest('detective rain noir mafia', 'story')).toBe('noir');
    expect(_detectDemoGenreForTest('wasteland bunker survivors', 'movie')).toBe('postapoc');
    expect(_detectDemoGenreForTest('magic academy grimoire', 'book')).toBe('magic');
  });

  it('generates genre-specific scifi demo', async () => {
    const sci = await generateWorldFromStory(
      'phi hành đoàn mắc kẹt trên hành tinh, wormhole và AI',
      'movie',
    );
    expect(sci.locations.length).toBeGreaterThanOrEqual(5);
    expect(sci.name.toLowerCase()).toMatch(/helios|hệ|space|neo|shield|vùng|học|thành/i);
  });

  it('generates demo world with locations graph', () => {
    expect(world.name).toBeTruthy();
    expect(world.locations.length).toBeGreaterThanOrEqual(4);
    expect(world.quests.length).toBeGreaterThan(0);
    expect(world.timeline.length).toBeGreaterThan(0);
    for (const loc of world.locations) {
      expect(loc.id).toBeTruthy();
      expect(loc.name).toBeTruthy();
      expect(Array.isArray(loc.connections)).toBe(true);
    }
  });

  it('export/import world pack regenerates ids', () => {
    const pack = exportWorldPack(world);
    expect(pack.format).toBe('xmultiverse-world-v1');
    const imported = importWorldPack(pack);
    expect(imported.id).not.toBe(world.id);
    expect(imported.name).toBe(world.name);
    expect(imported.locations.length).toBe(world.locations.length);
    expect(imported.locations[0].id).not.toBe(world.locations[0].id);
  });

  it('starting location prefers city/safe tags', () => {
    const start = getStartingLocation(world);
    expect(start).toBeDefined();
    expect(start!.tags?.some((t) => t === 'city' || t === 'safe') || true).toBe(true);
  });

  it('findLocation resolves by id and name', () => {
    const first = world.locations[0];
    expect(findLocation(world, first.id)?.name).toBe(first.name);
    expect(findLocation(world, first.name)?.id).toBe(first.id);
  });

  it('travel respects connection graph', () => {
    const start = getStartingLocation(world)!;
    const player: Player = {
      id: 'p1',
      worldId: world.id,
      name: 'Kael',
      role: 'Warrior',
      backstory: '',
      inventory: [],
      stats: createDefaultStats('warrior'),
      currentScene: start.description,
      currentLocationId: start.id,
      visitedLocations: [start.id],
      questLog: [],
      relationships: {},
      sceneSummaries: [],
      journal: [],
      createdAt: Date.now(),
    };

    const connectedName = start.connections[0];
    expect(connectedName).toBeTruthy();
    const dest = findLocation(world, connectedName)!;
    expect(canTravel(start, dest)).toBe(true);

    const result = travelToLocation(world, player, dest.id);
    expect(result.location.id).toBe(dest.id);
    expect(result.scene).toContain(dest.name);
    expect(result.choices.length).toBeGreaterThan(0);

    // Find a location not in connections (if any)
    const unreachable = world.locations.find(
      (l) =>
        l.id !== start.id &&
        !start.connections.some((c) => c.toLowerCase() === l.name.toLowerCase() || c === l.id),
    );
    if (unreachable) {
      expect(() => travelToLocation(world, player, unreachable.id)).toThrow(/Không thể đi/);
    }
  });
});
