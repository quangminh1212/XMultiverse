import dotenv from 'dotenv';

dotenv.config();

export interface AiClientConfig {
  apiKey: string;
  baseURL: string;
  model: string;
  demoMode: boolean;
}

export interface ServerConfig {
  port: number;
  dbPath: string;
  ai: AiClientConfig;
}

function parseBoolean(value: string | undefined, defaultValue = false): boolean {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

export function loadConfig(): ServerConfig {
  return {
    port: Number(process.env.PORT) || 3001,
    dbPath: process.env.DB_PATH || './data/worlds.db',
    ai: {
      apiKey: process.env.AI_API_KEY || '',
      baseURL: process.env.AI_BASE_URL || 'https://api.openai.com/v1',
      model: process.env.AI_MODEL || 'gpt-4o-mini',
      demoMode: parseBoolean(process.env.DEMO_MODE, false),
    },
  };
}

export const config = loadConfig();
