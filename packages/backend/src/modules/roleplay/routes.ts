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

export default router;
