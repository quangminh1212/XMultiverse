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
import type { Player, TimelineEvent } from '../types';

const router = Router();

router.post('/worlds', async (req, res, next) => {
  try {
    const { story } = req.body;
    if (!story || typeof story !== 'string') {
      res.status(400).json({ error: 'story là bắt buộc' });
      return;
    }
    const world = await generateWorldFromStory(story);
    saveWorld(world);
    res.json(world);
  } catch (err) {
    next(err);
  }
});

router.get('/worlds', (_req, res) => {
  res.json(listWorlds());
});

router.get('/worlds/:id', (req, res) => {
  const world = getWorld(req.params.id);
  if (!world) {
    res.status(404).json({ error: 'Không tìm thấy thế giới' });
    return;
  }
  res.json(world);
});

router.post('/worlds/:id/events', (req, res) => {
  const world = getWorld(req.params.id);
  if (!world) {
    res.status(404).json({ error: 'Không tìm thấy thế giới' });
    return;
  }
  const { year, title, description, important } = req.body;
  if (!title || !description) {
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
  res.json(world);
});

router.post('/worlds/:id/players', (req, res) => {
  const world = getWorld(req.params.id);
  if (!world) {
    res.status(404).json({ error: 'Không tìm thấy thế giới' });
    return;
  }
  const { name, role, backstory, faction } = req.body;
  if (!name || !role) {
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
  res.json(player);
});

router.get('/worlds/:id/players', (req, res) => {
  res.json(getPlayersByWorld(req.params.id));
});

router.post('/players/:id/act', async (req, res, next) => {
  try {
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

    const { action } = req.body;
    if (!action) {
      res.status(400).json({ error: 'action là bắt buộc' });
      return;
    }

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
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/players/:id/history', (req, res) => {
  res.json(getChatHistory(req.params.id, 50));
});

export default router;
