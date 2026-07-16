/**
 * Feature flags — modular toggles for open-world systems.
 * Disable via env: XMV_FEATURES_DISABLED=journal,relationships
 * Or enable-only: XMV_FEATURES=world,travel,roleplay,player
 */

export type FeatureId =
  | 'world'
  | 'travel'
  | 'roleplay'
  | 'player'
  | 'quest'
  | 'journal'
  | 'rpg'
  | 'save'
  | 'timeline'
  | 'relationships'
  | 'discovery'
  | 'auth'
  | 'multiplayer'
  | 'marketplace'
  | 'streaming';

export interface FeatureDef {
  id: FeatureId;
  name: string;
  description: string;
  /** Core modules cannot be disabled (world + player + roleplay). */
  core?: boolean;
  defaultEnabled: boolean;
}

export const FEATURE_CATALOG: FeatureDef[] = [
  {
    id: 'world',
    name: 'World building',
    description: 'Tạo / list / import / export thế giới',
    core: true,
    defaultEnabled: true,
  },
  {
    id: 'player',
    name: 'Players',
    description: 'Tạo nhân vật, stats cơ bản',
    core: true,
    defaultEnabled: true,
  },
  {
    id: 'travel',
    name: 'Travel & map',
    description: 'Đồ thị địa điểm open-world, du hành',
    defaultEnabled: true,
  },
  {
    id: 'roleplay',
    name: 'Roleplay GM',
    description: 'Hành động nhập vai / AI Game Master',
    core: true,
    defaultEnabled: true,
  },
  {
    id: 'quest',
    name: 'Quests',
    description: 'Quest log và cập nhật nhiệm vụ',
    defaultEnabled: true,
  },
  {
    id: 'journal',
    name: 'Journal',
    description: 'Nhật ký khám phá',
    defaultEnabled: true,
  },
  {
    id: 'discovery',
    name: 'Discovery',
    description: '% địa điểm đã khám phá',
    defaultEnabled: true,
  },
  {
    id: 'rpg',
    name: 'RPG systems',
    description: 'Inventory, dice, skill checks',
    defaultEnabled: true,
  },
  {
    id: 'relationships',
    name: 'NPC relationships',
    description: 'Disposition trust/respect/…',
    defaultEnabled: true,
  },
  {
    id: 'save',
    name: 'Save / load',
    description: 'Snapshot save/load',
    defaultEnabled: true,
  },
  {
    id: 'timeline',
    name: 'Timeline events',
    description: 'Thêm sự kiện dòng thời gian',
    defaultEnabled: true,
  },
  {
    id: 'auth',
    name: 'Auth',
    description: 'Local accounts + bearer tokens',
    defaultEnabled: true,
  },
  {
    id: 'multiplayer',
    name: 'Multiplayer',
    description: 'Share codes + online presence',
    defaultEnabled: true,
  },
  {
    id: 'marketplace',
    name: 'Marketplace',
    description: 'Publish / browse / install world packs',
    defaultEnabled: true,
  },
  {
    id: 'streaming',
    name: 'Streaming GM',
    description: 'SSE streaming for roleplay scenes',
    defaultEnabled: true,
  },
];

function parseList(envVal: string | undefined): Set<string> {
  if (!envVal?.trim()) return new Set();
  return new Set(
    envVal
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** Runtime enable map (can be patched in tests). */
const runtimeOverrides = new Map<FeatureId, boolean>();

export function setFeatureEnabled(id: FeatureId, enabled: boolean): void {
  const def = FEATURE_CATALOG.find((f) => f.id === id);
  if (def?.core && !enabled) {
    throw new Error(`Cannot disable core feature: ${id}`);
  }
  runtimeOverrides.set(id, enabled);
}

export function resetFeatureOverrides(): void {
  runtimeOverrides.clear();
}

export function isFeatureEnabled(id: FeatureId): boolean {
  if (runtimeOverrides.has(id)) return runtimeOverrides.get(id)!;

  const def = FEATURE_CATALOG.find((f) => f.id === id);
  if (!def) return false;
  if (def.core) return true;

  const disabled = parseList(process.env.XMV_FEATURES_DISABLED || process.env.FEATURES_DISABLED);
  if (disabled.has(id) || disabled.has('all')) return false;

  const only = parseList(process.env.XMV_FEATURES || process.env.FEATURES_ENABLED);
  if (only.size > 0) {
    // always keep core
    if (def.core) return true;
    return only.has(id) || only.has('all');
  }

  return def.defaultEnabled;
}

export function listFeatures(): Array<FeatureDef & { enabled: boolean }> {
  return FEATURE_CATALOG.map((f) => ({ ...f, enabled: isFeatureEnabled(f.id) }));
}
