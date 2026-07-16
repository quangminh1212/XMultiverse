/**
 * Open-world scale presets — real open world, sized to taste.
 *
 * compact   → small map, minimal lore (mobile / demo)
 * standard  → default balanced world
 * expansive → large graph, more quests/NPCs
 * epic      → max open-world density (still capped for safety)
 * custom    → merge standard with env/API overrides
 */

export type WorldScaleId = 'compact' | 'standard' | 'expansive' | 'epic' | 'custom';

export interface WorldScaleLimits {
  id: WorldScaleId;
  label: string;
  description: string;
  /** Target location count for a "real" open map at this scale. */
  locationsTarget: number;
  locationsMax: number;
  timelineMax: number;
  questsMax: number;
  charactersMax: number;
  factionsMax: number;
  storyInputMax: number;
  journalMax: number;
  journalTextMax: number;
  sceneSummariesMax: number;
  sceneSummaryLen: number;
  chatHistoryAi: number;
  chatHistoryClient: number;
  autosaveChat: number;
  manualSaveChat: number;
  inventoryMax: number;
  relationshipNotesMax: number;
  questLogMax: number;
  autosaveMinIntervalMs: number;
  actionMax: number;
  descriptionMax: number;
  /** Soft hint for AI worldgen prompt. */
  genHint: string;
}

const BASE = {
  journalTextMax: 160,
  sceneSummaryLen: 120,
  actionMax: 800,
  descriptionMax: 2000,
  autosaveMinIntervalMs: 45_000,
} as const;

export const WORLD_SCALES: Record<Exclude<WorldScaleId, 'custom'>, WorldScaleLimits> = {
  compact: {
    id: 'compact',
    label: 'Compact',
    description: 'Bản đồ nhỏ, nhanh, phù hợp demo / thiết bị yếu.',
    locationsTarget: 5,
    locationsMax: 5,
    timelineMax: 12,
    questsMax: 3,
    charactersMax: 4,
    factionsMax: 3,
    storyInputMax: 500,
    journalMax: 8,
    sceneSummariesMax: 4,
    chatHistoryAi: 6,
    chatHistoryClient: 20,
    autosaveChat: 8,
    manualSaveChat: 24,
    inventoryMax: 16,
    relationshipNotesMax: 3,
    questLogMax: 5,
    genHint: 'Tạo 5 địa điểm nối chặt, 3 quest, 3–4 NPC. Rất gọn.',
    ...BASE,
  },
  standard: {
    id: 'standard',
    label: 'Standard',
    description: 'Cân bằng — open world đủ chơi, vẫn nhẹ.',
    locationsTarget: 8,
    locationsMax: 8,
    timelineMax: 24,
    questsMax: 5,
    charactersMax: 6,
    factionsMax: 4,
    storyInputMax: 800,
    journalMax: 12,
    sceneSummariesMax: 5,
    chatHistoryAi: 8,
    chatHistoryClient: 30,
    autosaveChat: 12,
    manualSaveChat: 40,
    inventoryMax: 24,
    relationshipNotesMax: 4,
    questLogMax: 8,
    genHint: 'Tạo 6–8 địa điểm open-world, 4–5 quest, 4–6 NPC.',
    ...BASE,
  },
  expansive: {
    id: 'expansive',
    label: 'Expansive',
    description: 'Bản đồ rộng, nhiều nhánh khám phá và nhiệm vụ.',
    locationsTarget: 16,
    locationsMax: 16,
    timelineMax: 40,
    questsMax: 8,
    charactersMax: 10,
    factionsMax: 5,
    storyInputMax: 1200,
    journalMax: 20,
    sceneSummariesMax: 8,
    chatHistoryAi: 12,
    chatHistoryClient: 50,
    autosaveChat: 20,
    manualSaveChat: 60,
    inventoryMax: 36,
    relationshipNotesMax: 6,
    questLogMax: 12,
    genHint:
      'Tạo 12–16 địa điểm đa dạng (city/wild/dungeon), 6–8 quest, 8–10 NPC, graph có nhiều nhánh.',
    ...BASE,
    journalTextMax: 200,
    sceneSummaryLen: 140,
  },
  epic: {
    id: 'epic',
    label: 'Epic',
    description: 'Open world lớn nhất được hỗ trợ (vẫn có trần an toàn).',
    locationsTarget: 28,
    locationsMax: 32,
    timelineMax: 64,
    questsMax: 12,
    charactersMax: 16,
    factionsMax: 6,
    storyInputMax: 2000,
    journalMax: 32,
    sceneSummariesMax: 12,
    chatHistoryAi: 16,
    chatHistoryClient: 80,
    autosaveChat: 30,
    manualSaveChat: 80,
    inventoryMax: 48,
    relationshipNotesMax: 8,
    questLogMax: 16,
    genHint: 'Tạo 20–28 địa điểm open-world phong phú, 8–12 quest, 12–16 NPC, nhiều vùng liên kết.',
    ...BASE,
    journalTextMax: 220,
    sceneSummaryLen: 160,
    descriptionMax: 3000,
    actionMax: 1200,
  },
};

export type ScaleOverrides = Partial<
  Omit<WorldScaleLimits, 'id' | 'label' | 'description' | 'genHint'>
>;

const SCALE_IDS: WorldScaleId[] = ['compact', 'standard', 'expansive', 'epic', 'custom'];

export function isWorldScaleId(v: unknown): v is WorldScaleId {
  return typeof v === 'string' && SCALE_IDS.includes(v as WorldScaleId);
}

export function parseWorldScaleId(v: unknown, fallback: WorldScaleId = 'standard'): WorldScaleId {
  if (isWorldScaleId(v)) return v;
  return fallback;
}

/** Default scale from env XMV_WORLD_SCALE (or WORLD_SCALE). */
export function defaultScaleId(): WorldScaleId {
  const raw = process.env.XMV_WORLD_SCALE || process.env.WORLD_SCALE || 'standard';
  return parseWorldScaleId(raw, 'standard');
}

function envNumber(key: string): number | undefined {
  const v = process.env[key];
  if (v === undefined || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** Optional env overrides for custom / fine-tuning any scale. */
export function envScaleOverrides(): ScaleOverrides {
  const o: ScaleOverrides = {};
  const map: [keyof ScaleOverrides, string][] = [
    ['locationsMax', 'XMV_LOCATIONS_MAX'],
    ['locationsTarget', 'XMV_LOCATIONS_TARGET'],
    ['timelineMax', 'XMV_TIMELINE_MAX'],
    ['questsMax', 'XMV_QUESTS_MAX'],
    ['charactersMax', 'XMV_CHARACTERS_MAX'],
    ['factionsMax', 'XMV_FACTIONS_MAX'],
    ['journalMax', 'XMV_JOURNAL_MAX'],
    ['inventoryMax', 'XMV_INVENTORY_MAX'],
  ];
  for (const [field, envKey] of map) {
    const n = envNumber(envKey);
    if (n !== undefined) (o as any)[field] = n;
  }
  return o;
}

export function resolveScale(
  scaleId?: WorldScaleId | string | null,
  overrides?: ScaleOverrides,
): WorldScaleLimits {
  const id = parseWorldScaleId(scaleId ?? defaultScaleId(), defaultScaleId());
  const base =
    id === 'custom'
      ? {
          ...WORLD_SCALES.standard,
          id: 'custom' as const,
          label: 'Custom',
          description: 'Standard + overrides.',
        }
      : { ...WORLD_SCALES[id] };

  const merged = {
    ...base,
    ...envScaleOverrides(),
    ...(overrides || {}),
    id,
  };

  // Safety: target never exceeds max; max hard-clamped
  merged.locationsMax = Math.min(Math.max(3, merged.locationsMax), 48);
  merged.locationsTarget = Math.min(
    Math.max(3, merged.locationsTarget || merged.locationsMax),
    merged.locationsMax,
  );
  return merged;
}

export function listScales(): WorldScaleLimits[] {
  return [
    WORLD_SCALES.compact,
    WORLD_SCALES.standard,
    WORLD_SCALES.expansive,
    WORLD_SCALES.epic,
    resolveScale('custom'),
  ];
}
