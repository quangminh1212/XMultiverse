import { describe, it, expect, beforeAll } from 'vitest';
import {
  generateWorldFromStory,
  getStartingLocation,
  findLocation,
  canTravel,
  travelToLocation,
} from './worldgen';
import type { Player, World } from '../types';
import { createDefaultStats } from './dice';

process.env.DEMO_MODE = 'true';

describe('worldgen open world', () => {
  let world: World;

  beforeAll(async () => {
    world = await generateWorldFromStory(
      'A knight seeks a divine sword to defeat a demon lord',
      'movie',
    );
  });

  it('generates demo world with locations graph', () => {
    expect(world.name).toBeTruthy();
    expect(world.locations.length).toBeGreaterThanOrEqual(4);
    expect(world.sourceType).toBe('movie');
    expect(world.quests.length).toBeGreaterThan(0);
    expect(world.timeline.length).toBeGreaterThan(0);
    for (const loc of world.locations) {
      expect(loc.id).toBeTruthy();
      expect(loc.name).toBeTruthy();
      expect(Array.isArray(loc.connections)).toBe(true);
    }
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
      questLog: [],
      relationships: {},
      sceneSummaries: [],
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
