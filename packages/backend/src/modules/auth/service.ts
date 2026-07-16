import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import {
  createUser,
  getUserByUsername,
  getUserById,
  createSession,
  getSessionUserId,
  deleteSession,
  type UserRow,
} from '../../platform/repository';

export function hashPassword(password: string, salt?: string): string {
  const s = salt || randomBytes(8).toString('hex');
  const h = createHash('sha256').update(`${s}:${password}`).digest('hex');
  return `${s}$${h}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split('$');
  if (!salt || !hash) return false;
  const next = hashPassword(password, salt);
  try {
    return timingSafeEqual(Buffer.from(next), Buffer.from(stored));
  } catch {
    return false;
  }
}

export function publicUser(u: UserRow) {
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    createdAt: u.createdAt,
  };
}

export function registerUser(username: string, password: string, displayName?: string) {
  const uname = username.trim().toLowerCase();
  if (uname.length < 3 || uname.length > 32) throw new Error('username must be 3–32 chars');
  if (password.length < 6) throw new Error('password must be at least 6 chars');
  if (getUserByUsername(uname)) throw new Error('username already taken');

  const user: UserRow = {
    id: uuidv4(),
    username: uname,
    passHash: hashPassword(password),
    displayName: (displayName || username).trim().slice(0, 64),
    createdAt: Date.now(),
  };
  createUser(user);
  const token = randomBytes(24).toString('hex');
  createSession(token, user.id);
  return { user: publicUser(user), token };
}

export function loginUser(username: string, password: string) {
  const user = getUserByUsername(username.trim().toLowerCase());
  if (!user || !verifyPassword(password, user.passHash)) {
    throw new Error('invalid username or password');
  }
  const token = randomBytes(24).toString('hex');
  createSession(token, user.id);
  return { user: publicUser(user), token };
}

export function userFromToken(token?: string | null) {
  if (!token) return null;
  const userId = getSessionUserId(token);
  if (!userId) return null;
  const user = getUserById(userId);
  return user ? publicUser(user) : null;
}

export function logoutToken(token: string) {
  deleteSession(token);
}
