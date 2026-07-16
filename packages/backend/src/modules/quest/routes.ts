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
// Quest log
// ============================================================

router.get('/players/:id/quests', requireFeature('quest'), (req, res) => {
  const player = getPlayer(req.params.id);
  if (!player) {
    res.status(404).json({ error: 'Không tìm thấy người chơi' });
    return;
  }
  const world = getWorld(player.worldId);
  const log = player.questLog || [];
  const enriched = log.map((q) => {
    const def = world?.quests.find((wq) => wq.id === q.questId);
    return {
      ...q,
      title: def?.title,
      description: def?.description,
      objective: def?.objective,
    };
  });
  res.json(enriched);
});

router.post('/players/:id/quests/:questId', requireFeature('quest'), (req, res, next) => {
  try {
    const player = getPlayer(req.params.id);
    if (!player) throw HttpError.notFound('Player not found');
    const world = getWorld(player.worldId);
    if (!world) throw HttpError.notFound('World not found');
    const status = parseQuestStatus(req.body?.status);
    const progress =
      typeof req.body?.progress === 'string' ? req.body.progress.slice(0, 500) : undefined;
    applyQuestUpdate(player, world, {
      questId: req.params.questId,
      status,
      progress,
    });
    savePlayer(player);
    info('api', `POST /players/${req.params.id}/quests/${req.params.questId} → ${status}`);
    res.json(player.questLog);
  } catch (err) {
    next(err);
  }
});

export default router;
