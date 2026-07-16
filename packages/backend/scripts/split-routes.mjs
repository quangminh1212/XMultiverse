import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcPath = path.join(__dirname, '../src/routes/api.ts');
const outPath = path.join(__dirname, '../src/modules/game/routes.ts');

const src = fs.readFileSync(srcPath, 'utf8');
const lines = src.split(/\n/);
const exportIdx = lines.findIndex((l) => l.startsWith('export default'));
const worldsIdx = lines.findIndex((l) => l.includes('// Worlds') || l.includes("router.post("));
// Prefer content starting at first router. after helpers
let bodyStart = lines.findIndex((l) => l.includes("router.post(") && lines[lines.indexOf(l) + 1]?.includes('/worlds'));
if (bodyStart < 0) {
  bodyStart = lines.findIndex((l, i) => l.includes("router.post(") && i > 50);
}
const body = lines.slice(bodyStart, exportIdx).join('\n');
console.log('bodyStart', bodyStart, 'exportIdx', exportIdx, 'body lines', exportIdx - bodyStart);

const header = `// Game domain HTTP routes (world, player, roleplay, travel, quest, rpg, save).
// Mounted by modules/game; logic services live under modules/<name>/service.ts.
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  generateWorldFromStory,
  generateRoleplayResponse,
  getStartingLocation,
  travelToLocation,
  findLocation,
} from '../../services/worldgen';
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
} from '../../services/repository';
import { info, warn } from '../../services/logger';
import {
  createDefaultStats,
  inferStatFromAction,
  inferDC,
  skillCheck,
  addXp,
  rollDice,
} from '../../services/dice';
import type { Player, TimelineEvent, InventoryItem, SaveSnapshot, QuestProgress } from '../../types';
import { HttpError } from '../../middleware/http-error';
import {
  requireString,
  parseSourceType,
  parseQuestStatus,
  asyncHandler,
} from '../../middleware/validate';
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
} from '../../services/player-state';

const router = Router();

`;

const out = header + body + '\n\nexport default router;\n';
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, out);
console.log('Wrote', outPath, 'bytes', out.length);
