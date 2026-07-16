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

router.get('/players/:id/journal', requireFeature('journal'), (req, res, next) => {
  try {
    const player = getPlayer(req.params.id);
    if (!player) throw HttpError.notFound('Player not found');
    ensurePlayerArrays(player);
    res.json(player.journal || []);
  } catch (err) {
    next(err);
  }
});

router.post('/players/:id/journal', requireFeature('journal'), (req, res, next) => {
  try {
    const player = getPlayer(req.params.id);
    if (!player) throw HttpError.notFound('Player not found');
    const world = getWorld(player.worldId);
    const text = requireString(req.body?.text, 'text', { min: 1, max: 500 });
    const entry = appendJournal(player, text, 'manual', world || undefined);
    savePlayer(player);
    res.status(201).json(entry);
  } catch (err) {
    next(err);
  }
});

router.get('/players/:id/discovery', requireFeature('discovery'), (req, res, next) => {
  try {
    const player = getPlayer(req.params.id);
    if (!player) throw HttpError.notFound('Player not found');
    const world = getWorld(player.worldId);
    if (!world) throw HttpError.notFound('World not found');
    res.json({
      ...discoveryProgress(player, world),
      visitedLocations: player.visitedLocations || [],
    });
  } catch (err) {
    next(err);
  }
});

export default router;
