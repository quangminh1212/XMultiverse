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
// Travel / Map — open-world location graph
// ============================================================

router.get('/worlds/:id/locations', requireFeature('travel'), (req, res) => {
  const world = getWorld(req.params.id);
  if (!world) {
    res.status(404).json({ error: 'Không tìm thấy thế giới' });
    return;
  }
  res.json(world.locations || []);
});

router.post('/players/:id/travel', requireFeature('travel'), (req, res, next) => {
  try {
    const player = getPlayer(req.params.id);
    if (!player) throw HttpError.notFound('Player not found');
    const world = getWorld(player.worldId);
    if (!world) throw HttpError.notFound('World not found');
    const target = req.body?.locationId || req.body?.location;
    if (!target || typeof target !== 'string') {
      throw HttpError.badRequest('locationId or location is required');
    }
    let result;
    try {
      result = travelToLocation(world, player, target);
    } catch (e: any) {
      throw HttpError.badRequest(e.message || 'Invalid travel');
    }
    const firstVisit = markVisited(player, result.location.id);
    const lim = getLimits(world.scale);
    player.currentLocationId = result.location.id;
    player.currentScene = result.scene.slice(0, lim.descriptionMax);
    pushSceneSummary(player, result.scene, world);
    // Journal only on first visit (avoid spam on re-travel)
    if (firstVisit) {
      appendJournal(
        player,
        `Khám phá ${result.location.name}${result.location.atmosphere ? ` — ${result.location.atmosphere}` : ''}`,
        'discover',
        world,
      );
    }
    persistPlayer(player, world);
    addChatMessage(player.id, {
      role: 'user',
      content: `Đi tới ${result.location.name}`,
    });
    addChatMessage(player.id, {
      role: 'assistant',
      content: result.scene.slice(0, lim.descriptionMax),
    });
    // Light autosave: only on discovery or explicit opt-in
    if (firstVisit || req.body?.autosave === true) {
      writeAutosave(player, world, firstVisit);
    }
    info('api', `POST /players/${req.params.id}/travel → 200: ${result.location.name}`);
    res.json({
      scene: result.scene,
      location: result.location,
      choices: result.choices,
      events: [],
      player,
      firstVisit,
      discovery: discoveryProgress(player, world),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/players/:id/location', (req, res) => {
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
  const loc = player.currentLocationId
    ? findLocation(world, player.currentLocationId)
    : getStartingLocation(world);
  res.json({ location: loc || null, currentLocationId: player.currentLocationId });
});

export default router;
