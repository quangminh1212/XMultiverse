import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  generateWorldFromStory,
  generateRoleplayResponse,
  getStartingLocation,
  travelToLocation,
  findLocation,
} from '../../platform/worldgen';
import {
  saveWorld,
  getWorld,
  listWorlds,
  deleteWorld,
  savePlayer,
  getPlayer,
  getPlayersByWorld,
  deletePlayer,
  addChatMessage,
  getChatHistory,
  clearChatHistory,
  saveSnapshot,
  getSnapshot,
  listSnapshotsByPlayer,
  listSnapshotsByWorld,
  deleteSnapshot,
} from '../../platform/repository';
import { info, warn } from '../../platform/logger';
import {
  createDefaultStats,
  inferStatFromAction,
  inferDC,
  skillCheck,
  addXp,
  rollDice,
} from '../../platform/dice';
import type { Player, TimelineEvent, InventoryItem, SaveSnapshot, QuestProgress } from '../../platform/types';
import { HttpError } from '../../platform/middleware/http-error';
import {
  requireString,
  parseSourceType,
  parseQuestStatus,
  asyncHandler,
} from '../../platform/middleware/validate';
import { parseWorldScaleId } from '../../config/world-scale';
import { getLimits } from '../../config/limits';
import { requireFeature } from '../shared/feature-guard';
import { clampDisp, applyQuestUpdate } from '../shared/helpers';
import {
  markVisited,
  appendJournal,
  writeAutosave,
  exportWorldPack,
  importWorldPack,
  ensurePlayerArrays,
  discoveryProgress,
  pushSceneSummary,
  trimPlayer,
  capTimeline,
  slimWorld,
  persistPlayer,
} from '../../platform/player-state';

const router = Router();

// ============================================================
// Save / Load snapshots — inspired by ai_rpg
// ============================================================

router.post('/players/:id/saves', requireFeature('save'), (req, res) => {
  const player = getPlayer(req.params.id);
  if (!player) {
    res.status(404).json({ error: 'Không tìm thấy người chơi' });
    return;
  }
  const world = getWorld(player.worldId);
  if (!world) {
    res.status(404).json({ error: 'Không tìm thấy thế giới' });
    return;
  }
  const { name } = req.body;
  const snapshot: SaveSnapshot = {
    id: uuidv4(),
    name: name || `Save ${new Date().toLocaleString('vi-VN')}`,
    worldId: world.id,
    playerId: player.id,
    createdAt: Date.now(),
    worldData: slimWorld(world),
    playerData: player,
    chatHistory: getChatHistory(player.id, getLimits(world.scale).manualSaveChat),
  };
  saveSnapshot(snapshot);
  info(
    'api',
    `POST /players/${req.params.id}/saves → 200: snapshot="${snapshot.name}" id=${snapshot.id}`,
  );
  res.json(snapshot);
});

router.get('/players/:id/saves', (req, res) => {
  const snapshots = listSnapshotsByPlayer(req.params.id);
  info('api', `GET /players/${req.params.id}/saves → 200: ${snapshots.length} saves`);
  res.json(
    snapshots.map((s) => ({
      id: s.id,
      name: s.name,
      createdAt: s.createdAt,
      worldId: s.worldId,
      playerId: s.playerId,
    })),
  );
});

router.post('/saves/:id/load', (req, res) => {
  const snapshot = getSnapshot(req.params.id);
  if (!snapshot) {
    res.status(404).json({ error: 'Không tìm thấy save' });
    return;
  }
  // Restore world and player
  saveWorld(snapshot.worldData);
  savePlayer(snapshot.playerData);
  // Clear and restore chat history
  clearChatHistory(snapshot.playerId);
  for (const msg of snapshot.chatHistory) {
    addChatMessage(snapshot.playerId, msg);
  }
  info('api', `POST /saves/${req.params.id}/load → 200: restored "${snapshot.name}"`);
  res.json({
    world: snapshot.worldData,
    player: snapshot.playerData,
    chatHistory: snapshot.chatHistory,
  });
});

router.delete('/saves/:id', (req, res) => {
  deleteSnapshot(req.params.id);
  info('api', `DELETE /saves/${req.params.id} → 200: deleted`);
  res.json({ ok: true });
});

router.get('/worlds/:id/saves', (req, res) => {
  const snapshots = listSnapshotsByWorld(req.params.id);
  res.json(
    snapshots.map((s) => ({
      id: s.id,
      name: s.name,
      createdAt: s.createdAt,
      playerId: s.playerId,
    })),
  );
});

export default router;
