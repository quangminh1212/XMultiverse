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
import type {
  Player,
  TimelineEvent,
  InventoryItem,
  SaveSnapshot,
  SourceType,
  QuestProgress,
} from '../types';

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

router.post('/worlds', async (req, res, next) => {
  try {
    const { story, sourceType } = req.body;
    if (!story || typeof story !== 'string') {
      warn('api', 'POST /worlds → 400: missing story');
      res.status(400).json({ error: 'story là bắt buộc' });
      return;
    }
    const src: SourceType =
      sourceType === 'movie' ||
      sourceType === 'book' ||
      sourceType === 'anime' ||
      sourceType === 'original'
        ? sourceType
        : 'story';
    info(
      'api',
      `POST /worlds: source=${src} story="${story.slice(0, 60)}..." (${story.length} chars)`,
    );
    const world = await generateWorldFromStory(story, src);
    saveWorld(world);
    info(
      'api',
      `POST /worlds → 200: world="${world.name}" id=${world.id} locations=${world.locations?.length || 0}`,
    );
    res.json(world);
  } catch (err) {
    next(err);
  }
});

router.get('/worlds', (_req, res) => {
  const worlds = listWorlds();
  info('api', `GET /worlds → 200: ${worlds.length} worlds`);
  res.json(worlds);
});

router.get('/worlds/:id', (req, res) => {
  const world = getWorld(req.params.id);
  if (!world) {
    warn('api', `GET /worlds/${req.params.id} → 404`);
    res.status(404).json({ error: 'Không tìm thấy thế giới' });
    return;
  }
  info('api', `GET /worlds/${req.params.id} → 200: "${world.name}"`);
  res.json(world);
});

router.delete('/worlds/:id', (req, res) => {
  const world = getWorld(req.params.id);
  if (!world) {
    warn('api', `DELETE /worlds/${req.params.id} → 404`);
    res.status(404).json({ error: 'Không tìm thấy thế giới' });
    return;
  }
  deleteWorld(req.params.id);
  info('api', `DELETE /worlds/${req.params.id} → 200: deleted "${world.name}"`);
  res.json({ ok: true });
});

router.post('/worlds/:id/events', (req, res) => {
  const world = getWorld(req.params.id);
  if (!world) {
    warn('api', `POST /worlds/${req.params.id}/events → 404`);
    res.status(404).json({ error: 'Không tìm thấy thế giới' });
    return;
  }
  const { year, title, description, important } = req.body;
  if (!title || !description) {
    warn('api', `POST /worlds/${req.params.id}/events → 400: missing title/desc`);
    res.status(400).json({ error: 'title và description là bắt buộc' });
    return;
  }
  const event: TimelineEvent = {
    id: crypto.randomUUID(),
    year: Number(year) || 0,
    title,
    description,
    important: important ?? false,
  };
  world.timeline.push(event);
  world.timeline.sort((a, b) => a.year - b.year);
  saveWorld(world);
  info('api', `POST /worlds/${req.params.id}/events → 200: added "${title}" (year ${year})`);
  res.json(world);
});

// ============================================================
// Players
// ============================================================

router.post('/worlds/:id/players', (req, res) => {
  const world = getWorld(req.params.id);
  if (!world) {
    warn('api', `POST /worlds/${req.params.id}/players → 404`);
    res.status(404).json({ error: 'Không tìm thấy thế giới' });
    return;
  }
  const { name, role, backstory, faction } = req.body;
  if (!name || !role) {
    warn('api', `POST /worlds/${req.params.id}/players → 400: missing name/role`);
    res.status(400).json({ error: 'name và role là bắt buộc' });
    return;
  }
  const startLoc = getStartingLocation(world);
  const player: Player = {
    id: crypto.randomUUID(),
    worldId: world.id,
    name,
    role,
    backstory: backstory || '',
    faction: faction || undefined,
    inventory: [],
    stats: createDefaultStats(role),
    currentScene: startLoc
      ? `${startLoc.description} Bạn đang ở ${startLoc.name}.`
      : world.description,
    currentLocationId: startLoc?.id,
    questLog: (world.quests || []).slice(0, 2).map(
      (q): QuestProgress => ({
        questId: q.id,
        status: 'active',
        progress: 'Mới nhận',
      }),
    ),
    relationships: {},
    sceneSummaries: [],
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
    `POST /worlds/${req.params.id}/players → 200: player="${name}" role=${role} id=${player.id} loc=${startLoc?.name || 'n/a'}`,
  );
  res.json(player);
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
    if (!player) {
      warn('api', `POST /players/${req.params.id}/act → 404: player not found`);
      res.status(404).json({ error: 'Không tìm thấy người chơi' });
      return;
    }
    const world = getWorld(player.worldId);
    if (!world) {
      warn('api', `POST /players/${req.params.id}/act → 404: world not found`);
      res.status(404).json({ error: 'Không tìm thấy thế giới' });
      return;
    }

    const { action } = req.body;
    if (!action) {
      warn('api', `POST /players/${req.params.id}/act → 400: missing action`);
      res.status(400).json({ error: 'action là bắt buộc' });
      return;
    }

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

    const history = getChatHistory(player.id, 20)
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

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
      if (dest) player.currentLocationId = dest.id;
    }

    player.currentScene = result.scene;

    // Add scene summary (keep last 10)
    const summary = result.scene.slice(0, 200);
    player.sceneSummaries.push(summary);
    if (player.sceneSummaries.length > 10) {
      player.sceneSummaries = player.sceneSummaries.slice(-10);
    }

    savePlayer(player);

    addChatMessage(player.id, { role: 'user', content: action });
    addChatMessage(player.id, {
      role: 'assistant',
      content: JSON.stringify({
        scene: result.scene,
        events: result.events,
        choices: result.choices,
        check: result.check,
        xpGained: result.xpGained,
      }),
    });

    if (result.events && result.events.length > 0) {
      for (const ev of result.events) {
        world.timeline.push({
          id: crypto.randomUUID(),
          year: new Date().getFullYear(),
          title: ev,
          description: `Sự kiện do ${player.name} tạo ra qua hành động: ${action}`,
          important: true,
        });
      }
      world.timeline.sort((a, b) => a.year - b.year);
      saveWorld(world);
      info('api', `POST /players/${req.params.id}/act: ${result.events.length} events added`);
    }

    info('api', `POST /players/${req.params.id}/act → 200: ${result.choices.length} choices`);
    res.json({ ...result, player });
  } catch (err) {
    next(err);
  }
});

router.get('/players/:id/history', (req, res) => {
  const history = getChatHistory(req.params.id, 50);
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

router.get('/worlds/:id/locations', (req, res) => {
  const world = getWorld(req.params.id);
  if (!world) {
    res.status(404).json({ error: 'Không tìm thấy thế giới' });
    return;
  }
  res.json(world.locations || []);
});

router.post('/players/:id/travel', (req, res) => {
  const player = getPlayer(req.params.id);
  if (!player) {
    warn('api', `POST /players/${req.params.id}/travel → 404 player`);
    res.status(404).json({ error: 'Không tìm thấy người chơi' });
    return;
  }
  const world = getWorld(player.worldId);
  if (!world) {
    res.status(404).json({ error: 'Không tìm thấy thế giới' });
    return;
  }
  const { locationId, location } = req.body;
  const target = locationId || location;
  if (!target) {
    res.status(400).json({ error: 'locationId hoặc location là bắt buộc' });
    return;
  }
  try {
    const result = travelToLocation(world, player, target);
    player.currentLocationId = result.location.id;
    player.currentScene = result.scene;
    player.sceneSummaries.push(result.scene.slice(0, 200));
    if (player.sceneSummaries.length > 10) {
      player.sceneSummaries = player.sceneSummaries.slice(-10);
    }
    savePlayer(player);
    addChatMessage(player.id, {
      role: 'user',
      content: `Di chuyển tới ${result.location.name}`,
    });
    addChatMessage(player.id, { role: 'assistant', content: result.scene });
    info(
      'api',
      `POST /players/${req.params.id}/travel → 200: ${result.location.name}`,
    );
    res.json({
      scene: result.scene,
      location: result.location,
      choices: result.choices,
      events: [],
      player,
    });
  } catch (err: any) {
    warn('api', `POST /players/${req.params.id}/travel → 400: ${err.message}`);
    res.status(400).json({ error: err.message });
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

router.get('/players/:id/quests', (req, res) => {
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

router.post('/players/:id/quests/:questId', (req, res) => {
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
  const { status, progress } = req.body;
  if (!status || !['active', 'completed', 'failed'].includes(status)) {
    res.status(400).json({ error: 'status phải là active|completed|failed' });
    return;
  }
  applyQuestUpdate(player, world, {
    questId: req.params.questId,
    status,
    progress,
  });
  savePlayer(player);
  info('api', `POST /players/${req.params.id}/quests/${req.params.questId} → ${status}`);
  res.json(player.questLog);
});

// ============================================================
// Inventory — inspired by ai_rpg + openRPG
// ============================================================

router.post('/players/:id/inventory', (req, res) => {
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

router.post('/roll', (req, res) => {
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

router.post('/players/:id/saves', (req, res) => {
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
    worldData: world,
    playerData: player,
    chatHistory: getChatHistory(player.id, 200),
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
