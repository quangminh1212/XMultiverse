import type {
  World,
  Player,
  RoleplayResult,
  InventoryItem,
  NPCDisposition,
  DiceCheckResult,
  SaveSnapshot,
  ChatMessage,
  Location,
  SourceType,
  QuestProgress,
  WorldPack,
  JournalEntry,
  DiscoveryInfo,
} from '../types';

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
  // Worlds
  listWorlds: () => request<World[]>('/worlds'),
  getWorld: (id: string) => request<World>(`/worlds/${id}`),
  createWorld: (story: string, sourceType: SourceType = 'story') =>
    request<World>('/worlds', {
      method: 'POST',
      body: JSON.stringify({ story, sourceType }),
    }),
  deleteWorld: (id: string) => request<{ ok: boolean }>(`/worlds/${id}`, { method: 'DELETE' }),
  listLocations: (worldId: string) => request<Location[]>(`/worlds/${worldId}/locations`),
  exportWorld: (id: string) => request<WorldPack>(`/worlds/${id}/export`),
  importWorld: (pack: WorldPack | World) =>
    request<World>('/worlds/import', { method: 'POST', body: JSON.stringify(pack) }),
  addTimelineEvent: (
    worldId: string,
    event: { year: string; title: string; description: string; important: boolean },
  ) => request<World>(`/worlds/${worldId}/events`, { method: 'POST', body: JSON.stringify(event) }),

  // Players
  listPlayers: (worldId: string) => request<Player[]>(`/worlds/${worldId}/players`),
  getPlayer: (id: string) => request<Player>(`/players/${id}`),
  createPlayer: (
    worldId: string,
    player: { name: string; role: string; backstory: string; faction: string },
  ) =>
    request<Player>(`/worlds/${worldId}/players`, { method: 'POST', body: JSON.stringify(player) }),
  deletePlayer: (id: string) => request<{ ok: boolean }>(`/players/${id}`, { method: 'DELETE' }),

  // Roleplay
  act: (playerId: string, action: string, autosave = false) =>
    request<RoleplayResult & { player?: Player; discovery?: DiscoveryInfo }>(
      `/players/${playerId}/act`,
      {
        method: 'POST',
        body: JSON.stringify({ action, autosave }),
      },
    ),
  getHistory: (playerId: string) => request<ChatMessage[]>(`/players/${playerId}/history`),
  clearHistory: (playerId: string) =>
    request<{ ok: boolean }>(`/players/${playerId}/history`, { method: 'DELETE' }),

  // Travel
  travel: (playerId: string, locationId: string, autosave = false) =>
    request<
      RoleplayResult & {
        player: Player;
        location: Location;
        firstVisit?: boolean;
        discovery?: DiscoveryInfo;
      }
    >(`/players/${playerId}/travel`, {
      method: 'POST',
      body: JSON.stringify({ locationId, autosave }),
    }),
  getPlayerLocation: (playerId: string) =>
    request<{ location: Location | null; currentLocationId?: string }>(
      `/players/${playerId}/location`,
    ),
  getDiscovery: (playerId: string) => request<DiscoveryInfo>(`/players/${playerId}/discovery`),
  getJournal: (playerId: string) => request<JournalEntry[]>(`/players/${playerId}/journal`),
  addJournal: (playerId: string, text: string) =>
    request<JournalEntry>(`/players/${playerId}/journal`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),

  // Quests
  getQuests: (playerId: string) => request<QuestProgress[]>(`/players/${playerId}/quests`),
  updateQuest: (
    playerId: string,
    questId: string,
    status: 'active' | 'completed' | 'failed',
    progress?: string,
  ) =>
    request<QuestProgress[]>(`/players/${playerId}/quests/${questId}`, {
      method: 'POST',
      body: JSON.stringify({ status, progress }),
    }),

  // Inventory
  addItem: (playerId: string, item: Partial<InventoryItem>) =>
    request<Player>(`/players/${playerId}/inventory`, {
      method: 'POST',
      body: JSON.stringify(item),
    }),
  removeItem: (playerId: string, itemId: string) =>
    request<Player>(`/players/${playerId}/inventory/${itemId}`, { method: 'DELETE' }),
  useItem: (playerId: string, itemId: string) =>
    request<{ player: Player; effects: string[] }>(`/players/${playerId}/inventory/${itemId}/use`, {
      method: 'POST',
    }),

  // Relationships
  getRelationships: (playerId: string) =>
    request<Record<string, NPCDisposition>>(`/players/${playerId}/relationships`),
  updateRelationship: (
    playerId: string,
    npcName: string,
    changes: {
      trust?: number;
      respect?: number;
      friendship?: number;
      fear?: number;
      note?: string;
    },
  ) =>
    request<NPCDisposition>(`/players/${playerId}/relationships/${npcName}`, {
      method: 'POST',
      body: JSON.stringify(changes),
    }),

  // Dice
  roll: (notation: string) =>
    request<{ notation: string; result: number; rolls: number[] }>('/roll', {
      method: 'POST',
      body: JSON.stringify({ notation }),
    }),
  skillCheck: (playerId: string, stat: string, dc: number) =>
    request<DiceCheckResult>(`/players/${playerId}/check`, {
      method: 'POST',
      body: JSON.stringify({ stat, dc }),
    }),

  // Save / Load
  createSave: (playerId: string, name: string) =>
    request<SaveSnapshot>(`/players/${playerId}/saves`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  listSaves: (playerId: string) => request<SaveSnapshot[]>(`/players/${playerId}/saves`),
  loadSave: (saveId: string) =>
    request<{ world: World; player: Player; chatHistory: ChatMessage[] }>(`/saves/${saveId}/load`, {
      method: 'POST',
    }),
  deleteSave: (saveId: string) =>
    request<{ ok: boolean }>(`/saves/${saveId}`, { method: 'DELETE' }),
};
