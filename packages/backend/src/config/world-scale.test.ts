import { describe, it, expect } from 'vitest';
import { resolveScale, listScales, parseWorldScaleId, WORLD_SCALES } from './world-scale';
import { getLimits } from './limits';
import { expandLocationGraph, generateWorldFromStory } from '../services/worldgen';

process.env.DEMO_MODE = 'true';

describe('world scale system', () => {
  it('lists presets compact→epic', () => {
    const ids = listScales().map((s) => s.id);
    expect(ids).toContain('compact');
    expect(ids).toContain('standard');
    expect(ids).toContain('expansive');
    expect(ids).toContain('epic');
  });

  it('expansive has more locations than compact', () => {
    expect(WORLD_SCALES.expansive.locationsMax).toBeGreaterThan(WORLD_SCALES.compact.locationsMax);
    expect(WORLD_SCALES.epic.locationsTarget).toBeGreaterThan(
      WORLD_SCALES.standard.locationsTarget,
    );
  });

  it('resolveScale applies custom overrides safely', () => {
    const s = resolveScale('custom', { locationsMax: 12, locationsTarget: 10 });
    expect(s.locationsMax).toBe(12);
    expect(s.locationsTarget).toBe(10);
  });

  it('parseWorldScaleId falls back', () => {
    expect(parseWorldScaleId('nope')).toBe('standard');
    expect(parseWorldScaleId('epic')).toBe('epic');
  });

  it('getLimits is scale-aware', () => {
    expect(getLimits('compact').locationsMax).toBe(5);
    expect(getLimits('epic').locationsMax).toBeGreaterThanOrEqual(28);
  });

  it('expandLocationGraph grows open-world connectivity', () => {
    const base = [
      {
        id: '1',
        name: 'A',
        description: 'A',
        connections: ['B'],
        npcs: [],
        tags: ['city'],
      },
      {
        id: '2',
        name: 'B',
        description: 'B',
        connections: ['A'],
        npcs: [],
        tags: [],
      },
    ];
    const expanded = expandLocationGraph(base, 8);
    expect(expanded.length).toBe(8);
    expect(expanded.every((l) => l.connections.length >= 1)).toBe(true);
  });

  it('demo world respects expansive scale location target', async () => {
    const w = await generateWorldFromStory(
      'A knight seeks a sword against a demon lord',
      'story',
      'expansive',
    );
    expect(w.scale).toBe('expansive');
    expect(w.locations.length).toBeGreaterThanOrEqual(WORLD_SCALES.expansive.locationsTarget);
    expect(w.locations.length).toBeLessThanOrEqual(WORLD_SCALES.expansive.locationsMax);
  });
});
