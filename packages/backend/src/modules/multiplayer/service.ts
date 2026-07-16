import { randomBytes } from 'crypto';
import {
  saveWorldShare,
  getWorldShare,
  listWorldSharesByWorld,
  upsertPresence,
  listPresence,
  clearPresence,
  getWorld,
  type PresenceRow,
} from '../../services/repository';
import { findLocation } from '../../services/worldgen';

export function createShareCode(worldId: string, ownerUserId?: string): string {
  if (!getWorld(worldId)) throw new Error('World not found');
  const code = randomBytes(3).toString('hex').toUpperCase();
  saveWorldShare(code, worldId, ownerUserId);
  return code;
}

export function resolveShareCode(code: string) {
  const share = getWorldShare(code);
  if (!share) throw new Error('Invalid share code');
  const world = getWorld(share.worldId);
  if (!world) throw new Error('World missing');
  return { share, world };
}

export function listShareCodes(worldId: string): string[] {
  return listWorldSharesByWorld(worldId);
}

export function heartbeatPresence(input: {
  playerId: string;
  worldId: string;
  playerName: string;
  userId?: string;
  locationId?: string;
}): PresenceRow {
  const world = getWorld(input.worldId);
  const loc = input.locationId && world ? findLocation(world, input.locationId) : undefined;
  const row: PresenceRow = {
    playerId: input.playerId,
    worldId: input.worldId,
    userId: input.userId,
    playerName: input.playerName,
    locationId: loc?.id || input.locationId,
    locationName: loc?.name,
    lastSeen: Date.now(),
  };
  upsertPresence(row);
  return row;
}

export function getOnlinePlayers(worldId: string, maxAgeMs = 90_000): PresenceRow[] {
  return listPresence(worldId, maxAgeMs);
}

export function leaveWorld(playerId: string): void {
  clearPresence(playerId);
}
