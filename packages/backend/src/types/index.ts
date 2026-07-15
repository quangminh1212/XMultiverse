/**
 * Domain types for the XMultiverse backend.
 * Inspired by ai_rpg (stats, inventory, relationships), GameMaster-GPT (dice),
 * and openRPG (world building).
 */

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
  createdAt: number;
}

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
  /** Relationship with player — inspired by ai_rpg disposition system */
  disposition?: NPCDisposition;
}

/** NPC disposition tracks multiple axes (from ai_rpg). Range: -100 to 100. */
export interface NPCDisposition {
  trust: number; // tin tưởng
  respect: number; // kính trọng
  friendship: number; // tình bạn
  fear: number; // sợ hãi
  notes: string[]; // ghi chú về tương tác
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  objective: string;
  status?: 'active' | 'completed' | 'failed';
}

/** Player stats — inspired by ai_rpg + GameMaster-GPT. */
export interface PlayerStats {
  level: number;
  xp: number;
  xpToNext: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  strength: number; // sức mạnh
  agility: number; // nhanh nhẹn
  intelligence: number; // trí tuệ
  charisma: number; // quyến rũ
  luck: number; // may mắn
}

/** Inventory item — inspired by ai_rpg + openRPG. */
export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  quantity: number;
  value?: number;
  effects?: ItemEffect[];
}

export type ItemType = 'weapon' | 'armor' | 'potion' | 'key' | 'misc' | 'quest';

export interface ItemEffect {
  stat: keyof Omit<PlayerStats, 'level' | 'xp' | 'xpToNext'>;
  modifier: number;
  duration?: 'instant' | 'permanent' | 'temporary';
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
  /** NPCs this player has interacted with and their disposition. */
  relationships: Record<string, NPCDisposition>;
  /** Summarized scene history for AI context (from ai_rpg scene summarization). */
  sceneSummaries: string[];
  createdAt: number;
}

export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface RoleplayResult {
  scene: string;
  events: string[];
  choices: string[];
  /** Dice check result if action required a skill check. */
  check?: DiceCheckResult;
  /** Stat/HP changes from this action. */
  effects?: StatChange[];
  /** Items gained or lost. */
  itemChanges?: ItemChange[];
  /** XP gained. */
  xpGained?: number;
}

/** Dice check result — inspired by GameMaster-GPT 1d20 system. */
export interface DiceCheckResult {
  roll: number; // raw dice roll
  modifier: number; // stat modifier
  total: number; // roll + modifier
  dc: number; // difficulty class
  success: boolean;
  stat: keyof PlayerStats;
  description: string;
}

export interface StatChange {
  stat: keyof PlayerStats;
  delta: number;
  reason: string;
}

export interface ItemChange {
  item: InventoryItem;
  action: 'add' | 'remove';
}

/** Save snapshot — inspired by ai_rpg save system. */
export interface SaveSnapshot {
  id: string;
  name: string;
  worldId: string;
  playerId: string;
  createdAt: number;
  worldData: World;
  playerData: Player;
  chatHistory: ChatMessage[];
}
