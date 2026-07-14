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

export interface Player {
  id: string;
  worldId: string;
  name: string;
  role: string;
  backstory: string;
  faction?: string;
  inventory: string[];
  currentScene: string;
}

export interface RoleplayResult {
  scene: string;
  events: string[];
  choices: string[];
}

export interface HealthStatus {
  status: string;
  demoMode: boolean;
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
  createPlayer: (
    worldId: string,
    player: { name: string; role: string; backstory: string; faction: string },
  ) => request<Player>('POST', `/api/worlds/${worldId}/players`, player),
  act: (playerId: string, action: string) =>
    request<RoleplayResult>('POST', `/api/players/${playerId}/act`, { action }),
  getHistory: (playerId: string) =>
    request<{ role: string; content: string }[]>('GET', `/api/players/${playerId}/history`),
};
