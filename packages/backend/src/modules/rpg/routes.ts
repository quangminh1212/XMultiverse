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

export default router;
