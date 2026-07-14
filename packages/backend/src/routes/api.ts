import { Router } from 'express';
import { generateWorldFromStory, generateRoleplayResponse } from '../services/worldgen';
import {
  saveWorld,
  getWorld,
  listWorlds,
  savePlayer,
  getPlayer,
  getPlayersByWorld,
  addChatMessage,
  getChatHistory,
} from '../services/repository';
import { info, warn } from '../services/logger';
import type { Player, TimelineEvent } from '../types';

const router = Router();

router.post('/worlds', async (req, res, next) => {
  try {
    const { story } = req.body;
    if (!story || typeof story !== 'string') {
      warn('api', 'POST /worlds → 400: missing story');
      res.status(400).json({ error: 'story là bắt buộc' });
      return;
    }
    info('api', `POST /worlds: story="${story.slice(0, 60)}..." (${story.length} chars)`);
    const world = await generateWorldFromStory(story);
    saveWorld(world);
    info('api', `POST /worlds → 200: world="${world.name}" id=${world.id}`);
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
  const player: Player = {
    id: crypto.randomUUID(),
    worldId: world.id,
    name,
    role,
    backstory: backstory || '',
    faction: faction || undefined,
    inventory: [],
    currentScene: world.description,
  };
  savePlayer(player);
  addChatMessage(player.id, {
    role: 'system',
    content: `Chào mừng ${name} đến với thế giới ${world.name}. Bạn là ${role}.`,
  });
  info('api', `POST /worlds/${req.params.id}/players → 200: player="${name}" id=${player.id}`);
  res.json(player);
});

router.get('/worlds/:id/players', (req, res) => {
  const players = getPlayersByWorld(req.params.id);
  info('api', `GET /worlds/${req.params.id}/players → 200: ${players.length} players`);
  res.json(players);
});

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

    const history = getChatHistory(player.id, 20)
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const result = await generateRoleplayResponse({
      world,
      player,
      history,
      action,
    });

    player.currentScene = result.scene;
    savePlayer(player);

    addChatMessage(player.id, { role: 'user', content: action });
    addChatMessage(player.id, {
      role: 'assistant',
      content: JSON.stringify({
        scene: result.scene,
        events: result.events,
        choices: result.choices,
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
      info(
        'api',
        `POST /players/${req.params.id}/act: ${result.events.length} events added to timeline`,
      );
    }

    info('api', `POST /players/${req.params.id}/act → 200: ${result.choices.length} choices`);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/players/:id/history', (req, res) => {
  const history = getChatHistory(req.params.id, 50);
  info('api', `GET /players/${req.params.id}/history → 200: ${history.length} messages`);
  res.json(history);
});

export default router;
