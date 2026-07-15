export interface Faction {
  name: string;
  description: string;
  goals: string[];
}

export interface TimelineEvent {
  id: string;
  year: number;
  title: string;
  description: string;
  important: boolean;
}

export interface Character {
  id: string;
  name: string;
  role: string;
  faction?: string;
  description: string;
  disposition?: NPCDisposition;
}

export interface NPCDisposition {
  trust: number;
  respect: number;
  friendship: number;
  fear: number;
  notes: string[];
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  objective: string;
  status?: 'active' | 'completed' | 'failed';
}

export type ItemType = 'weapon' | 'armor' | 'potion' | 'key' | 'misc' | 'quest';

export interface ItemEffect {
  stat:
    'hp' | 'maxHp' | 'mp' | 'maxMp' | 'strength' | 'agility' | 'intelligence' | 'charisma' | 'luck';
  modifier: number;
  duration?: 'instant' | 'permanent' | 'temporary';
}

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  quantity: number;
  value?: number;
  effects?: ItemEffect[];
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

export interface World {
  id: string;
  storyInput: string;
  name: string;
  description: string;
  geography: string[];
  factions: Faction[];
  magicSystem?: string;
  technologyLevel?: string;
  timeline: TimelineEvent[];
  characters: Character[];
  quests: Quest[];
  createdAt?: string;
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
  check?: DiceCheckResult;
  effects?: StatChange[];
  itemChanges?: ItemChange[];
  xpGained?: number;
  player?: Player;
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

export interface StatChange {
  stat: string;
  delta: number;
  reason: string;
}

export interface ItemChange {
  item: InventoryItem;
  action: 'add' | 'remove';
}

export interface SaveSnapshot {
  id: string;
  name: string;
  worldId: string;
  playerId: string;
  createdAt: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
