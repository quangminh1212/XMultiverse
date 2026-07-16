import { Router } from 'express';
import { requireString } from '../../platform/middleware/validate';
import { HttpError } from '../../platform/middleware/http-error';
import { requireFeature } from '../shared/feature-guard';
import {
  getPlayer,
  getWorld,
  getChatHistory,
  addChatMessage,
  saveWorld,
} from '../../platform/repository';
import { inferStatFromAction, inferDC, skillCheck, addXp } from '../../platform/dice';
import {
  markVisited,
  pushSceneSummary,
  trimPlayer,
  persistPlayer,
  discoveryProgress,
  capTimeline,
  appendJournal,
} from '../../platform/player-state';
import { findLocation } from '../../platform/worldgen';
import { getLimits } from '../../config/limits';
import { applyQuestUpdate, clampDisp } from '../shared/helpers';
import { streamRoleplay } from './service';
import { info } from '../../platform/logger';

const router = Router();

/**
 * SSE stream of roleplay tokens + final structured result.
 * Event format: data: {"type":"token"|"done"|"error",...}\n\n
 */
router.post('/players/:id/act/stream', requireFeature('streaming'), async (req, res, next) => {
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

    const stat = inferStatFromAction(action);
    let check = undefined;
    if (stat && player.stats) {
      check = skillCheck(stat, player.stats, inferDC(action));
    }

    const history = getChatHistory(player.id, lim.chatHistoryAi)
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content.slice(0, 280),
      }));

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const send = (obj: unknown) => {
      res.write(`data: ${JSON.stringify(obj)}\n\n`);
    };

    for await (const ev of streamRoleplay({ world, player, history, action, check })) {
      if (ev.type === 'token') {
        send(ev);
        continue;
      }
      if (ev.type === 'error') {
        send(ev);
        res.end();
        return;
      }

      // done — apply same mutations as non-stream act
      const result = ev.result;
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
      if (result.itemChanges) {
        for (const change of result.itemChanges) {
          if (change.action === 'add') {
            const existing = player.inventory.find((i) => i.name === change.item.name);
            if (existing) existing.quantity += change.item.quantity;
            else
              player.inventory.push({
                ...change.item,
                id: change.item.id || crypto.randomUUID(),
              });
          } else {
            player.inventory = player.inventory.filter((i) => i.name !== change.item.name);
          }
        }
      }
      if (result.xpGained && result.xpGained > 0) addXp(player.stats, result.xpGained);
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
      if (result.questUpdates) {
        for (const qu of result.questUpdates) applyQuestUpdate(player, world, qu);
      }
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
      trimPlayer(player, world);
      persistPlayer(player, world);
      addChatMessage(player.id, { role: 'user', content: action.slice(0, lim.actionMax) });
      addChatMessage(player.id, {
        role: 'assistant',
        content: result.scene.slice(0, lim.descriptionMax),
      });
      if (result.events?.length) {
        for (const evTitle of result.events.slice(0, 2)) {
          world.timeline.push({
            id: crypto.randomUUID(),
            year: new Date().getFullYear(),
            title: String(evTitle).slice(0, 120),
            description: `Sự kiện do ${player.name}`,
            important: true,
          });
        }
        capTimeline(world);
        saveWorld(world);
      }

      info('stream', `act stream done player=${player.id}`);
      send({
        type: 'done',
        result: { ...result, player, discovery: discoveryProgress(player, world) },
      });
    }
    res.end();
  } catch (err) {
    next(err);
  }
});

export default router;
