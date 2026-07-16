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

router.post(
  '/worlds',
  requireFeature('world'),
  asyncHandler(async (req, res) => {
    const story = requireString(req.body?.story, 'story', { min: 5, max: 20_000 });
    const src = parseSourceType(req.body?.sourceType);
    const scale = parseWorldScaleId(req.body?.scale);
    info(
      'api',
      `POST /worlds: scale=${scale} source=${src} story="${story.slice(0, 60)}..." (${story.length} chars)`,
    );
    const world = slimWorld(await generateWorldFromStory(story, src, scale), scale);
    saveWorld(world);
    info(
      'api',
      `POST /worlds → 201: world="${world.name}" id=${world.id} locations=${world.locations?.length || 0} scale=${world.scale}`,
    );
    res.status(201).json(world);
  }),
);

router.get('/worlds', (_req, res) => {
  // Lightweight list projection (full detail via GET /worlds/:id)
  const worlds = listWorlds().map((w) => ({
    id: w.id,
    name: w.name,
    description: (w.description || '').slice(0, 220),
    sourceType: w.sourceType,
    geography: (w.geography || []).slice(0, 8),
    locations: (w.locations || []).slice(0, 8).map((l) => ({
      id: l.id,
      name: l.name,
    })),
    characters: (w.characters || []).slice(0, 4).map((c) => ({
      id: c.id,
      name: c.name,
      role: c.role,
    })),
    quests: (w.quests || []).slice(0, 4).map((q) => ({
      id: q.id,
      title: q.title,
    })),
    factions: (w.factions || []).slice(0, 4).map((f) => ({ name: f.name })),
    createdAt: w.createdAt,
  }));
  info('api', `GET /worlds → 200: ${worlds.length} worlds (light list)`);
  res.json(worlds);
});

router.get('/worlds/:id', (req, res, next) => {
  try {
    const world = getWorld(req.params.id);
    if (!world) throw HttpError.notFound('World not found');
    info('api', `GET /worlds/${req.params.id} → 200: "${world.name}"`);
    res.json(world);
  } catch (err) {
    next(err);
  }
});

router.delete('/worlds/:id', (req, res, next) => {
  try {
    const world = getWorld(req.params.id);
    if (!world) throw HttpError.notFound('World not found');
    deleteWorld(req.params.id);
    info('api', `DELETE /worlds/${req.params.id} → 200: deleted "${world.name}"`);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.get('/worlds/:id/export', (req, res, next) => {
  try {
    const world = getWorld(req.params.id);
    if (!world) throw HttpError.notFound('World not found');
    const pack = exportWorldPack(world);
    info('api', `GET /worlds/${req.params.id}/export → pack "${world.name}"`);
    res.json(pack);
  } catch (err) {
    next(err);
  }
});

router.post('/worlds/import', (req, res, next) => {
  try {
    const body = req.body;
    if (!body || (!body.world && !body.name)) {
      throw HttpError.badRequest('Body must be a world pack { format, world } or a World object');
    }
    const world = importWorldPack(
      body.format === 'xmultiverse-world-v1' || body.world ? body : { world: body },
    );
    info('api', `POST /worlds/import → 201 "${world.name}" id=${world.id}`);
    res.status(201).json(world);
  } catch (err: any) {
    if (err instanceof HttpError) return next(err);
    next(HttpError.badRequest(err.message || 'Invalid world pack'));
  }
});

router.post('/worlds/:id/events', (req, res, next) => {
  try {
    const world = getWorld(req.params.id);
    if (!world) throw HttpError.notFound('World not found');
    const title = requireString(req.body?.title, 'title', { max: 200 });
    const description = requireString(req.body?.description, 'description', { max: 5000 });
    const year = Number(req.body?.year) || 0;
    const event: TimelineEvent = {
      id: crypto.randomUUID(),
      year,
      title,
      description,
      important: Boolean(req.body?.important),
    };
    world.timeline.push(event);
    world.timeline.sort((a, b) => a.year - b.year);
    saveWorld(world);
    info('api', `POST /worlds/${req.params.id}/events → 200: added "${title}" (year ${year})`);
    res.status(201).json(world);
  } catch (err) {
    next(err);
  }
});


export default router;
