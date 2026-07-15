/**
 * Thin HTTP client that talks to the running XMultiverse backend.
 * All methods return parsed JSON.
 */

const DEFAULT_BASE = 'http://localhost:3001';

function getBase(): string {
  return process.env.XMV_API_URL || DEFAULT_BASE;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const url = `${getBase()}${path}`;
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const errMsg = (data as any)?.error || `HTTP ${res.status}`;
    throw new Error(errMsg);
  }

  return data as T;
}

export interface World {
  id: string;
  storyInput: string;
  name: string;
  description: string;
  geography: string[];
  factions: { name: string; description: string; goals: string[] }[];
  magicSystem?: string;
  technologyLevel?: string;
  timeline: {
    id: string;
    year: number;
    title: string;
    description: string;
    important: boolean;
  }[];
  characters: { id: string; name: string; role: string; faction?: string; description: string }[];
  quests: { id: string; title: string; description: string; objective: string }[];
  createdAt: number;
}

export interface PlayerStats {
  level: number;
  xp: number;
  xpToNext: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  strength: number;
  agility: number;
  intelligence: number;
  charisma: number;
  luck: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  type: string;
  quantity: number;
  value?: number;
  effects?: { stat: string; modifier: number; duration?: string }[];
}

export interface NPCDisposition {
  trust: number;
  respect: number;
  friendship: number;
  fear: number;
  notes: string[];
}

export interface Player {
  id: string;
  worldId: string;
  name: string;
  role: string;
  backstory: string;
  faction?: string;
  inventory: InventoryItem[];
  stats: PlayerStats;
  currentScene: string;
  relationships: Record<string, NPCDisposition>;
  sceneSummaries: string[];
  createdAt?: number;
}

export interface RoleplayResult {
  scene: string;
  events: string[];
  choices: string[];
  check?: {
    roll: number;
    modifier: number;
    total: number;
    dc: number;
    success: boolean;
    stat: string;
    description: string;
  };
  effects?: { stat: string; delta: number; reason: string }[];
  itemChanges?: { item: InventoryItem; action: 'add' | 'remove' }[];
  xpGained?: number;
  player?: Player;
}

export interface HealthStatus {
  status: string;
  demoMode: boolean;
}

export interface SaveSnapshot {
  id: string;
  name: string;
  worldId: string;
  playerId: string;
  createdAt: number;
}

export interface DiceCheckResult {
  roll: number;
  modifier: number;
  total: number;
  dc: number;
  success: boolean;
  stat: string;
  description: string;
}

export const api = {
  health: () => request<HealthStatus>('GET', '/health'),
  listWorlds: () => request<World[]>('GET', '/api/worlds'),
  getWorld: (id: string) => request<World>('GET', `/api/worlds/${id}`),
  createWorld: (story: string) => request<World>('POST', '/api/worlds', { story }),
  addEvent: (
    worldId: string,
    event: { year: number; title: string; description: string; important: boolean },
  ) => request<World>('POST', `/api/worlds/${worldId}/events`, event),

  listPlayers: (worldId: string) => request<Player[]>('GET', `/api/worlds/${worldId}/players`),
  getPlayer: (id: string) => request<Player>('GET', `/api/players/${id}`),
  createPlayer: (
    worldId: string,
    player: { name: string; role: string; backstory: string; faction: string },
  ) => request<Player>('POST', `/api/worlds/${worldId}/players`, player),

  act: (playerId: string, action: string) =>
    request<RoleplayResult>('POST', `/api/players/${playerId}/act`, { action }),
  getHistory: (playerId: string) =>
    request<{ role: string; content: string }[]>('GET', `/api/players/${playerId}/history`),

  // Inventory
  addItem: (playerId: string, item: Partial<InventoryItem>) =>
    request<Player>('POST', `/api/players/${playerId}/inventory`, item),
  removeItem: (playerId: string, itemId: string) =>
    request<Player>('DELETE', `/api/players/${playerId}/inventory/${itemId}`),
  useItem: (playerId: string, itemId: string) =>
    request<{ player: Player; effects: string[] }>(
      'POST',
      `/api/players/${playerId}/inventory/${itemId}/use`,
    ),

  // Relationships
  getRelationships: (playerId: string) =>
    request<Record<string, NPCDisposition>>('GET', `/api/players/${playerId}/relationships`),

  // Dice
  roll: (notation: string) =>
    request<{ notation: string; result: number; rolls: number[] }>('POST', '/api/roll', {
      notation,
    }),
  skillCheck: (playerId: string, stat: string, dc: number) =>
    request<DiceCheckResult>('POST', `/api/players/${playerId}/check`, { stat, dc }),

  // Save / Load
  createSave: (playerId: string, name: string) =>
    request<SaveSnapshot>('POST', `/api/players/${playerId}/saves`, { name }),
  listSaves: (playerId: string) => request<SaveSnapshot[]>('GET', `/api/players/${playerId}/saves`),
  loadSave: (saveId: string) =>
    request<{ world: World; player: Player; chatHistory: { role: string; content: string }[] }>(
      'POST',
      `/api/saves/${saveId}/load`,
    ),
  deleteSave: (saveId: string) => request<{ ok: boolean }>('DELETE', `/api/saves/${saveId}`),
};
