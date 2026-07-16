import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  generateWorldFromStory,
  generateRoleplayResponse,
  getStartingLocation,
  travelToLocation,
  findLocation,
} from '../services/worldgen';
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
} from '../services/repository';
import { info, warn } from '../services/logger';
import {
  createDefaultStats,
  inferStatFromAction,
  inferDC,
  skillCheck,
  addXp,
  rollDice,
} from '../services/dice';
import type { Player, TimelineEvent, InventoryItem, SaveSnapshot, QuestProgress } from '../types';
import { HttpError } from '../middleware/http-error';
import {
  requireString,
  parseSourceType,
  parseQuestStatus,
  asyncHandler,
} from '../middleware/validate';
import { parseWorldScaleId } from '../config/world-scale';
import { getLimits } from '../config/limits';
import { requireFeature } from '../modules/shared/feature-guard';
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
} from '../services/player-state';

const router = Router();

function clampDisp(n: number): number {
  return Math.max(-100, Math.min(100, n));
}

function applyQuestUpdate(
  player: Player,
  world: { quests: { id: string; title: string }[] },
  qu: QuestProgress,
): void {
  if (!player.questLog) player.questLog = [];
  // Match by quest id or title
  let questId = qu.questId;
  const byTitle = world.quests.find(
    (q) => q.title.toLowerCase() === String(qu.questId).toLowerCase(),
  );
  if (byTitle) questId = byTitle.id;

  const existing = player.questLog.find((q) => q.questId === questId);
  if (existing) {
    existing.status = qu.status;
    if (qu.progress) existing.progress = qu.progress;
  } else {
    player.questLog.push({
      questId,
      status: qu.status,
      progress: qu.progress,
    });
  }
}

// ============================================================
// Worlds
// ============================================================

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

// ============================================================
// Roleplay — with dice checks and stat effects
// ============================================================

router.post('/players/:id/act', async (req, res, next) => {
  try {
    const player = getPlayer(req.params.id);
    if (!player) throw HttpError.notFound('Player not found');
    const world = getWorld(player.worldId);
    if (!world) throw HttpError.notFound('World not found');

    const lim = getLimits(world.scale);
    const action = requireString(req.body?.action, 'action', {
      min: 1,
      max: lim.actionMax,
    });

    info(
      'api',
      `POST /players/${req.params.id}/act: player="${player.name}" action="${action.slice(0, 60)}..."`,
    );

    // Determine if a skill check is needed
    const stat = inferStatFromAction(action);
    let check = undefined;
    if (stat && player.stats) {
      const dc = inferDC(action);
      check = skillCheck(stat, player.stats, dc);
      info('api', `Skill check: ${check.description}`);
    }

    // Lightweight AI context: few recent non-system messages, scene only if JSON
    const history = getChatHistory(player.id, lim.chatHistoryAi)
      .filter((m) => m.role !== 'system')
      .map((m) => {
        let content = m.content;
        if (m.role === 'assistant' && content.startsWith('{')) {
          try {
            content = JSON.parse(content).scene || content;
          } catch {
            /* keep */
          }
        }
        return {
          role: m.role as 'user' | 'assistant',
          content: content.slice(0, 280),
        };
      });

    const result = await generateRoleplayResponse({
      world,
      player,
      history,
      action,
      check,
    });

    // Apply effects to player stats
    if (result.effects) {
      for (const effect of result.effects) {
        const currentVal = player.stats[effect.stat] as number;
        if (effect.stat === 'hp' || effect.stat === 'mp') {
          const maxKey = effect.stat === 'hp' ? 'maxHp' : 'maxMp';
          const max = player.stats[maxKey] as number;
          (player.stats[effect.stat] as number) = Math.max(
            0,
            Math.min(max, currentVal + effect.delta),
          );
        } else {
          (player.stats[effect.stat] as number) = currentVal + effect.delta;
        }
      }
    }

    // Apply item changes
    if (result.itemChanges) {
      for (const change of result.itemChanges) {
        if (change.action === 'add') {
          const existing = player.inventory.find((i) => i.name === change.item.name);
          if (existing) {
            existing.quantity += change.item.quantity;
          } else {
            player.inventory.push({ ...change.item, id: change.item.id || crypto.randomUUID() });
          }
        } else {
          player.inventory = player.inventory.filter((i) => i.name !== change.item.name);
        }
      }
    }

    // Apply XP
    if (result.xpGained && result.xpGained > 0) {
      const newLevel = addXp(player.stats, result.xpGained);
      if (newLevel) {
        info('api', `${player.name} leveled up to ${newLevel}!`);
      }
    }

    // Apply relationship changes
    if (result.relationshipChanges) {
      if (!player.relationships) player.relationships = {};
      for (const rc of result.relationshipChanges) {
        if (!player.relationships[rc.npc]) {
          player.relationships[rc.npc] = {
            trust: 0,
            respect: 0,
            friendship: 0,
            fear: 0,
            notes: [],
          };
        }
        const rel = player.relationships[rc.npc];
        if (rc.trust) rel.trust = clampDisp(rel.trust + rc.trust);
        if (rc.respect) rel.respect = clampDisp(rel.respect + rc.respect);
        if (rc.friendship) rel.friendship = clampDisp(rel.friendship + rc.friendship);
        if (rc.fear) rel.fear = clampDisp(rel.fear + rc.fear);
        if (rc.note) rel.notes.push(rc.note);
      }
    }

    // Apply quest updates
    if (result.questUpdates) {
      if (!player.questLog) player.questLog = [];
      for (const qu of result.questUpdates) {
        applyQuestUpdate(player, world, qu);
      }
    }

    // Location move from roleplay
    if (result.movedToLocationId) {
      const dest = findLocation(world, result.movedToLocationId);
      if (dest) {
        player.currentLocationId = dest.id;
        if (markVisited(player, dest.id)) {
          appendJournal(player, `Khám phá địa điểm mới: ${dest.name}.`, 'discover', world);
        }
      }
    }

    player.currentScene = result.scene.slice(0, lim.descriptionMax);
    pushSceneSummary(player, result.scene, world);
    // Journal only on discovery moves — not every act (keeps payload light)
    trimPlayer(player, world);
    persistPlayer(player, world);

    // Store plain text (not full JSON blob) to keep chat DB small
    addChatMessage(player.id, { role: 'user', content: action.slice(0, lim.actionMax) });
    addChatMessage(player.id, {
      role: 'assistant',
      content: result.scene.slice(0, lim.descriptionMax),
    });

    if (result.events && result.events.length > 0) {
      for (const ev of result.events.slice(0, 2)) {
        world.timeline.push({
          id: crypto.randomUUID(),
          year: new Date().getFullYear(),
          title: String(ev).slice(0, 120),
          description: `Sự kiện do ${player.name}: ${action.slice(0, 80)}`,
          important: true,
        });
      }
      world.timeline.sort((a, b) => a.year - b.year);
      capTimeline(world);
      saveWorld(world);
      info('api', `POST /players/${req.params.id}/act: events added (capped)`);
    }

    // Autosave is opt-in + throttled (lightweight by default)
    if (req.body?.autosave === true) {
      writeAutosave(player, world);
    }

    info('api', `POST /players/${req.params.id}/act → 200: ${result.choices.length} choices`);
    res.json({
      ...result,
      player,
      discovery: discoveryProgress(player, world),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/players/:id/history', (req, res) => {
  const player = getPlayer(req.params.id);
  const world = player ? getWorld(player.worldId) : null;
  const history = getChatHistory(req.params.id, getLimits(world?.scale).chatHistoryClient);
  info('api', `GET /players/${req.params.id}/history → 200: ${history.length} messages`);
  res.json(history);
});

router.delete('/players/:id/history', (req, res) => {
  clearChatHistory(req.params.id);
  info('api', `DELETE /players/${req.params.id}/history → 200: cleared`);
  res.json({ ok: true });
});

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

// ============================================================
// Inventory — inspired by ai_rpg + openRPG
// ============================================================

router.post('/players/:id/inventory', requireFeature('rpg'), (req, res) => {
  const player = getPlayer(req.params.id);
  if (!player) {
    warn('api', `POST /players/${req.params.id}/inventory → 404`);
    res.status(404).json({ error: 'Không tìm thấy người chơi' });
    return;
  }
  const { name, description, type, quantity, value, effects } = req.body;
  if (!name) {
    res.status(400).json({ error: 'name là bắt buộc' });
    return;
  }
  const item: InventoryItem = {
    id: crypto.randomUUID(),
    name,
    description: description || '',
    type: type || 'misc',
    quantity: quantity || 1,
    value,
    effects,
  };
  const existing = player.inventory.find((i) => i.name === name);
  if (existing) {
    existing.quantity += item.quantity;
  } else {
    player.inventory.push(item);
  }
  savePlayer(player);
  info('api', `POST /players/${req.params.id}/inventory → 200: added "${name}" x${item.quantity}`);
  res.json(player);
});

router.delete('/players/:id/inventory/:itemId', (req, res) => {
  const player = getPlayer(req.params.id);
  if (!player) {
    res.status(404).json({ error: 'Không tìm thấy người chơi' });
    return;
  }
  player.inventory = player.inventory.filter((i) => i.id !== req.params.itemId);
  savePlayer(player);
  info('api', `DELETE /players/${req.params.id}/inventory/${req.params.itemId} → 200`);
  res.json(player);
});

router.post('/players/:id/inventory/:itemId/use', (req, res) => {
  const player = getPlayer(req.params.id);
  if (!player) {
    res.status(404).json({ error: 'Không tìm thấy người chơi' });
    return;
  }
  const item = player.inventory.find((i) => i.id === req.params.itemId);
  if (!item) {
    res.status(404).json({ error: 'Không tìm thấy vật phẩm' });
    return;
  }
  if (!item.effects || item.effects.length === 0) {
    res.status(400).json({ error: 'Vật phẩm này không thể sử dụng' });
    return;
  }

  const results: string[] = [];
  for (const effect of item.effects) {
    if (effect.stat === 'hp' || effect.stat === 'mp') {
      const maxKey = effect.stat === 'hp' ? 'maxHp' : 'maxMp';
      const max = player.stats[maxKey] as number;
      const before = player.stats[effect.stat] as number;
      (player.stats[effect.stat] as number) = Math.min(max, before + effect.modifier);
      results.push(
        `${effect.stat.toUpperCase()} +${effect.modifier} (${before} → ${player.stats[effect.stat]})`,
      );
    } else {
      (player.stats[effect.stat] as number) += effect.modifier;
      results.push(`${effect.stat} +${effect.modifier}`);
    }
  }

  item.quantity -= 1;
  if (item.quantity <= 0) {
    player.inventory = player.inventory.filter((i) => i.id !== item.id);
  }

  savePlayer(player);
  info(
    'api',
    `POST /players/${req.params.id}/inventory/${req.params.itemId}/use → 200: ${results.join(', ')}`,
  );
  res.json({ player, effects: results });
});

// ============================================================
// Relationships — inspired by ai_rpg disposition system
// ============================================================

router.get('/players/:id/relationships', (req, res) => {
  const player = getPlayer(req.params.id);
  if (!player) {
    res.status(404).json({ error: 'Không tìm thấy người chơi' });
    return;
  }
  res.json(player.relationships || {});
});

router.post('/players/:id/relationships/:npcName', (req, res) => {
  const player = getPlayer(req.params.id);
  if (!player) {
    res.status(404).json({ error: 'Không tìm thấy người chơi' });
    return;
  }
  const npcName = req.params.npcName;
  const { trust, respect, friendship, fear, note } = req.body;
  if (!player.relationships) player.relationships = {};
  if (!player.relationships[npcName]) {
    player.relationships[npcName] = { trust: 0, respect: 0, friendship: 0, fear: 0, notes: [] };
  }
  const rel = player.relationships[npcName];
  if (trust !== undefined) rel.trust = clampDisp(rel.trust + trust);
  if (respect !== undefined) rel.respect = clampDisp(rel.respect + respect);
  if (friendship !== undefined) rel.friendship = clampDisp(rel.friendship + friendship);
  if (fear !== undefined) rel.fear = clampDisp(rel.fear + fear);
  if (note) rel.notes.push(note);
  savePlayer(player);
  info('api', `POST /players/${req.params.id}/relationships/${npcName} → 200: updated`);
  res.json(player.relationships[npcName]);
});

// ============================================================
// Dice — standalone roll endpoint
// ============================================================

router.post('/roll', requireFeature('rpg'), (req, res) => {
  const { notation, stat, playerId } = req.body;
  if (!notation) {
    res.status(400).json({ error: 'notation là bắt buộc (vd: 1d20, 3d6)' });
    return;
  }
  const result = rollDice(notation);
  info('api', `POST /roll: ${notation} = ${result}`);
  res.json({ notation, result, rolls: [result] });
});

router.post('/players/:id/check', (req, res) => {
  const player = getPlayer(req.params.id);
  if (!player) {
    res.status(404).json({ error: 'Không tìm thấy người chơi' });
    return;
  }
  const { stat, dc } = req.body;
  if (!stat) {
    res.status(400).json({ error: 'stat là bắt buộc' });
    return;
  }
  const dcValue = Number(dc) || 12;
  const check = skillCheck(stat, player.stats, dcValue);
  info('api', `POST /players/${req.params.id}/check → 200: ${check.description}`);
  res.json(check);
});

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
