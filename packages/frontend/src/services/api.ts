import type { World, Player, RoleplayResult } from '../types';

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data as T;
}

export const api = {
  listWorlds: () => request<World[]>('/worlds'),

  getWorld: (id: string) => request<World>(`/worlds/${id}`),

  createWorld: (story: string) =>
    request<World>('/worlds', {
      method: 'POST',
      body: JSON.stringify({ story }),
    }),

  addTimelineEvent: (
    worldId: string,
    event: { year: string; title: string; description: string; important: boolean },
  ) =>
    request<World>(`/worlds/${worldId}/events`, {
      method: 'POST',
      body: JSON.stringify(event),
    }),

  listPlayers: (worldId: string) => request<Player[]>(`/worlds/${worldId}/players`),

  createPlayer: (
    worldId: string,
    player: { name: string; role: string; backstory: string; faction: string },
  ) =>
    request<Player>(`/worlds/${worldId}/players`, {
      method: 'POST',
      body: JSON.stringify(player),
    }),

  act: (playerId: string, action: string) =>
    request<RoleplayResult>(`/players/${playerId}/act`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    }),
};
