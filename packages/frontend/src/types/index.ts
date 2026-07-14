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
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  objective: string;
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
}

export interface Player {
  id: string;
  name: string;
  role: string;
  backstory: string;
  faction?: string;
  currentScene: string;
}

export interface RoleplayResult {
  scene: string;
  events: string[];
  choices: string[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
