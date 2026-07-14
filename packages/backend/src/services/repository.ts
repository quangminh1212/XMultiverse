import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { config } from '../config';
import type { World, Player, ChatMessage } from '../types';

const DB_PATH = config.dbPath;

function ensureDir(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

ensureDir(DB_PATH);
const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS worlds (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    world_id TEXT NOT NULL,
    data TEXT NOT NULL,
    FOREIGN KEY (world_id) REFERENCES worlds(id)
  );

  CREATE TABLE IF NOT EXISTS chats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (player_id) REFERENCES players(id)
  );

  CREATE INDEX IF NOT EXISTS idx_players_world ON players(world_id);
  CREATE INDEX IF NOT EXISTS idx_chats_player ON chats(player_id);
`);

export function saveWorld(world: World): void {
  const stmt = db.prepare('INSERT OR REPLACE INTO worlds (id, data, created_at) VALUES (?, ?, ?)');
  stmt.run(world.id, JSON.stringify(world), world.createdAt);
}

export function getWorld(id: string): World | null {
  const row = db.prepare('SELECT data FROM worlds WHERE id = ?').get(id) as
    { data: string } | undefined;
  return row ? JSON.parse(row.data) : null;
}

export function listWorlds(): World[] {
  const rows = db.prepare('SELECT data FROM worlds ORDER BY created_at DESC').all() as {
    data: string;
  }[];
  return rows.map((r) => JSON.parse(r.data));
}

export function savePlayer(player: Player): void {
  const stmt = db.prepare('INSERT OR REPLACE INTO players (id, world_id, data) VALUES (?, ?, ?)');
  stmt.run(player.id, player.worldId, JSON.stringify(player));
}

export function getPlayer(id: string): Player | null {
  const row = db.prepare('SELECT data FROM players WHERE id = ?').get(id) as
    { data: string } | undefined;
  return row ? JSON.parse(row.data) : null;
}

export function getPlayersByWorld(worldId: string): Player[] {
  const rows = db.prepare('SELECT data FROM players WHERE world_id = ?').all(worldId) as {
    data: string;
  }[];
  return rows.map((r) => JSON.parse(r.data));
}

export function addChatMessage(playerId: string, message: ChatMessage): void {
  const stmt = db.prepare(
    'INSERT INTO chats (player_id, role, content, created_at) VALUES (?, ?, ?, ?)',
  );
  stmt.run(playerId, message.role, message.content, Date.now());
}

export function getChatHistory(playerId: string, limit = 50): ChatMessage[] {
  const rows = db
    .prepare('SELECT role, content FROM chats WHERE player_id = ? ORDER BY created_at DESC LIMIT ?')
    .all(playerId, limit) as { role: ChatMessage['role']; content: string }[];
  return rows.reverse();
}
