import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { config } from '../config';
import type { World, Player, ChatMessage, SaveSnapshot } from '../types';

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

  CREATE TABLE IF NOT EXISTS snapshots (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    world_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    pass_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS world_shares (
    code TEXT PRIMARY KEY,
    world_id TEXT NOT NULL,
    owner_user_id TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (world_id) REFERENCES worlds(id)
  );

  CREATE TABLE IF NOT EXISTS presence (
    player_id TEXT PRIMARY KEY,
    world_id TEXT NOT NULL,
    user_id TEXT,
    player_name TEXT NOT NULL,
    location_id TEXT,
    location_name TEXT,
    last_seen INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS market_packs (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    description TEXT NOT NULL,
    tags TEXT NOT NULL,
    downloads INTEGER NOT NULL DEFAULT 0,
    data TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_players_world ON players(world_id);
  CREATE INDEX IF NOT EXISTS idx_chats_player ON chats(player_id);
  CREATE INDEX IF NOT EXISTS idx_snapshots_world ON snapshots(world_id);
  CREATE INDEX IF NOT EXISTS idx_snapshots_player ON snapshots(player_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_presence_world ON presence(world_id);
  CREATE INDEX IF NOT EXISTS idx_market_created ON market_packs(created_at);
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

export function deleteWorld(id: string): void {
  db.prepare('DELETE FROM worlds WHERE id = ?').run(id);
  db.prepare('DELETE FROM players WHERE world_id = ?').run(id);
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

export function deletePlayer(id: string): void {
  db.prepare('DELETE FROM players WHERE id = ?').run(id);
  db.prepare('DELETE FROM chats WHERE player_id = ?').run(id);
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

export function clearChatHistory(playerId: string): void {
  db.prepare('DELETE FROM chats WHERE player_id = ?').run(playerId);
}

// ============================================================
// Save / Load snapshots — inspired by ai_rpg save system
// ============================================================

export function saveSnapshot(snapshot: SaveSnapshot): void {
  const stmt = db.prepare(
    'INSERT OR REPLACE INTO snapshots (id, name, world_id, player_id, data, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  );
  stmt.run(
    snapshot.id,
    snapshot.name,
    snapshot.worldId,
    snapshot.playerId,
    JSON.stringify(snapshot),
    snapshot.createdAt,
  );
}

export function getSnapshot(id: string): SaveSnapshot | null {
  const row = db.prepare('SELECT data FROM snapshots WHERE id = ?').get(id) as
    { data: string } | undefined;
  return row ? JSON.parse(row.data) : null;
}

export function listSnapshotsByPlayer(playerId: string): SaveSnapshot[] {
  const rows = db
    .prepare('SELECT data FROM snapshots WHERE player_id = ? ORDER BY created_at DESC')
    .all(playerId) as { data: string }[];
  return rows.map((r) => JSON.parse(r.data));
}

export function listSnapshotsByWorld(worldId: string): SaveSnapshot[] {
  const rows = db
    .prepare('SELECT data FROM snapshots WHERE world_id = ? ORDER BY created_at DESC')
    .all(worldId) as { data: string }[];
  return rows.map((r) => JSON.parse(r.data));
}

export function deleteSnapshot(id: string): void {
  db.prepare('DELETE FROM snapshots WHERE id = ?').run(id);
}

// ============================================================
// Users / sessions (local auth)
// ============================================================

export interface UserRow {
  id: string;
  username: string;
  passHash: string;
  displayName: string;
  createdAt: number;
}

export function createUser(user: UserRow): void {
  db.prepare(
    'INSERT INTO users (id, username, pass_hash, display_name, created_at) VALUES (?, ?, ?, ?, ?)',
  ).run(user.id, user.username, user.passHash, user.displayName, user.createdAt);
}

export function getUserByUsername(username: string): UserRow | null {
  const row = db
    .prepare(
      'SELECT id, username, pass_hash as passHash, display_name as displayName, created_at as createdAt FROM users WHERE username = ?',
    )
    .get(username.toLowerCase()) as UserRow | undefined;
  return row || null;
}

export function getUserById(id: string): UserRow | null {
  const row = db
    .prepare(
      'SELECT id, username, pass_hash as passHash, display_name as displayName, created_at as createdAt FROM users WHERE id = ?',
    )
    .get(id) as UserRow | undefined;
  return row || null;
}

export function createSession(token: string, userId: string, ttlMs = 7 * 24 * 3600_000): void {
  const now = Date.now();
  db.prepare(
    'INSERT OR REPLACE INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
  ).run(token, userId, now, now + ttlMs);
}

export function getSessionUserId(token: string): string | null {
  const row = db
    .prepare('SELECT user_id as userId, expires_at as expiresAt FROM sessions WHERE token = ?')
    .get(token) as { userId: string; expiresAt: number } | undefined;
  if (!row) return null;
  if (row.expiresAt < Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return null;
  }
  return row.userId;
}

export function deleteSession(token: string): void {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

// ============================================================
// World shares (multiplayer join codes)
// ============================================================

export function saveWorldShare(code: string, worldId: string, ownerUserId?: string): void {
  db.prepare(
    'INSERT OR REPLACE INTO world_shares (code, world_id, owner_user_id, created_at) VALUES (?, ?, ?, ?)',
  ).run(code.toUpperCase(), worldId, ownerUserId || null, Date.now());
}

export function getWorldShare(
  code: string,
): { code: string; worldId: string; ownerUserId?: string } | null {
  const row = db
    .prepare(
      'SELECT code, world_id as worldId, owner_user_id as ownerUserId FROM world_shares WHERE code = ?',
    )
    .get(code.toUpperCase()) as { code: string; worldId: string; ownerUserId?: string } | undefined;
  return row || null;
}

export function listWorldSharesByWorld(worldId: string): string[] {
  const rows = db.prepare('SELECT code FROM world_shares WHERE world_id = ?').all(worldId) as {
    code: string;
  }[];
  return rows.map((r) => r.code);
}

// ============================================================
// Presence (multiplayer online)
// ============================================================

export interface PresenceRow {
  playerId: string;
  worldId: string;
  userId?: string;
  playerName: string;
  locationId?: string;
  locationName?: string;
  lastSeen: number;
}

export function upsertPresence(p: PresenceRow): void {
  db.prepare(
    `INSERT OR REPLACE INTO presence
     (player_id, world_id, user_id, player_name, location_id, location_name, last_seen)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    p.playerId,
    p.worldId,
    p.userId || null,
    p.playerName,
    p.locationId || null,
    p.locationName || null,
    p.lastSeen,
  );
}

export function listPresence(worldId: string, maxAgeMs = 60_000): PresenceRow[] {
  const cutoff = Date.now() - maxAgeMs;
  const rows = db
    .prepare(
      `SELECT player_id as playerId, world_id as worldId, user_id as userId,
              player_name as playerName, location_id as locationId,
              location_name as locationName, last_seen as lastSeen
       FROM presence WHERE world_id = ? AND last_seen >= ? ORDER BY last_seen DESC`,
    )
    .all(worldId, cutoff) as PresenceRow[];
  return rows;
}

export function clearPresence(playerId: string): void {
  db.prepare('DELETE FROM presence WHERE player_id = ?').run(playerId);
}

// ============================================================
// Marketplace packs
// ============================================================

export interface MarketPackRow {
  id: string;
  slug: string;
  title: string;
  author: string;
  description: string;
  tags: string[];
  downloads: number;
  data: string;
  createdAt: number;
}

export function saveMarketPack(pack: MarketPackRow): void {
  db.prepare(
    `INSERT OR REPLACE INTO market_packs
     (id, slug, title, author, description, tags, downloads, data, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    pack.id,
    pack.slug,
    pack.title,
    pack.author,
    pack.description,
    JSON.stringify(pack.tags),
    pack.downloads,
    pack.data,
    pack.createdAt,
  );
}

export function listMarketPacks(limit = 50): Omit<MarketPackRow, 'data'>[] {
  const rows = db
    .prepare(
      `SELECT id, slug, title, author, description, tags, downloads, created_at as createdAt
       FROM market_packs ORDER BY created_at DESC LIMIT ?`,
    )
    .all(limit) as any[];
  return rows.map((r) => ({
    ...r,
    tags: JSON.parse(r.tags || '[]'),
  }));
}

export function getMarketPack(idOrSlug: string): MarketPackRow | null {
  const row = db
    .prepare(
      `SELECT id, slug, title, author, description, tags, downloads, data, created_at as createdAt
       FROM market_packs WHERE id = ? OR slug = ?`,
    )
    .get(idOrSlug, idOrSlug) as any;
  if (!row) return null;
  return { ...row, tags: JSON.parse(row.tags || '[]') };
}

export function bumpMarketDownload(id: string): void {
  db.prepare('UPDATE market_packs SET downloads = downloads + 1 WHERE id = ?').run(id);
}

export function searchMarketPacks(q: string, limit = 30): Omit<MarketPackRow, 'data'>[] {
  const like = `%${q.toLowerCase()}%`;
  const rows = db
    .prepare(
      `SELECT id, slug, title, author, description, tags, downloads, created_at as createdAt
       FROM market_packs
       WHERE lower(title) LIKE ? OR lower(description) LIKE ? OR lower(tags) LIKE ? OR lower(author) LIKE ?
       ORDER BY downloads DESC LIMIT ?`,
    )
    .all(like, like, like, like, limit) as any[];
  return rows.map((r) => ({ ...r, tags: JSON.parse(r.tags || '[]') }));
}
