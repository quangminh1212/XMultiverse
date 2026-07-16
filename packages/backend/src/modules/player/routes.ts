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
// Players
// ============================================================

router.post('/worlds/:id/players', (req, res, next) => {
  try {
    const world = getWorld(req.params.id);
    if (!world) throw HttpError.notFound('World not found');
    const name = requireString(req.body?.name, 'name', { min: 1, max: 80 });
    const role = requireString(req.body?.role, 'role', { min: 1, max: 80 });
    const backstory =
      typeof req.body?.backstory === 'string' ? req.body.backstory.slice(0, 4000) : '';
    const faction =
      typeof req.body?.faction === 'string' && req.body.faction.trim()
        ? req.body.faction.trim().slice(0, 80)
        : undefined;
    const startLoc = getStartingLocation(world);
    const player: Player = {
      id: crypto.randomUUID(),
      worldId: world.id,
      name,
      role,
      backstory,
      faction,
      inventory: [],
      stats: createDefaultStats(role),
      currentScene: startLoc
        ? `${startLoc.description} Bạn đang ở ${startLoc.name}.`
        : world.description,
      currentLocationId: startLoc?.id,
      visitedLocations: startLoc ? [startLoc.id] : [],
      questLog: (world.quests || []).slice(0, 2).map((q): QuestProgress => ({
        questId: q.id,
        status: 'active',
        progress: 'Mới nhận',
      })),
      relationships: {},
      sceneSummaries: [],
      journal: startLoc
        ? [
            {
              id: crypto.randomUUID(),
              at: Date.now(),
              locationId: startLoc.id,
              locationName: startLoc.name,
              text: `Bước chân đầu tiên tại ${startLoc.name}.`,
              source: 'discover',
            },
          ]
        : [],
      createdAt: Date.now(),
    };
    savePlayer(player);
    addChatMessage(player.id, {
      role: 'system',
      content: `Chào mừng ${name} đến với thế giới ${world.name}. Bạn là ${role}.${
        startLoc ? ` Bắt đầu tại: ${startLoc.name}.` : ''
      }`,
    });
    info(
      'api',
      `POST /worlds/${req.params.id}/players → 201: player="${name}" role=${role} id=${player.id}`,
    );
    res.status(201).json(player);
  } catch (err) {
    next(err);
  }
});

router.get('/worlds/:id/players', (req, res) => {
  const players = getPlayersByWorld(req.params.id);
  info('api', `GET /worlds/${req.params.id}/players → 200: ${players.length} players`);
  res.json(players);
});

router.get('/players/:id', (req, res) => {
  const player = getPlayer(req.params.id);
  if (!player) {
    warn('api', `GET /players/${req.params.id} → 404`);
    res.status(404).json({ error: 'Không tìm thấy người chơi' });
    return;
  }
  info('api', `GET /players/${req.params.id} → 200: "${player.name}"`);
  res.json(player);
});

router.delete('/players/:id', (req, res) => {
  const player = getPlayer(req.params.id);
  if (!player) {
    warn('api', `DELETE /players/${req.params.id} → 404`);
    res.status(404).json({ error: 'Không tìm thấy người chơi' });
    return;
  }
  deletePlayer(req.params.id);
  info('api', `DELETE /players/${req.params.id} → 200: deleted "${player.name}"`);
  res.json({ ok: true });
});

export default router;
