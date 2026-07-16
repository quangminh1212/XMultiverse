/**
 * Split modules/game/routes.ts into per-SWC route files + write module index.ts
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.join(__dirname, '../src');
const gameRoutes = path.join(srcRoot, 'modules/game/routes.ts');
const text = fs.readFileSync(gameRoutes, 'utf8');
const lines = text.split(/\n/);

// Find section markers (// === style headers with next line comment)
const sections = [];
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('// ===') && lines[i + 1]?.includes('// ')) {
    const name = lines[i + 1].replace(/^\/\/\s*/, '').trim();
    sections.push({ name, start: i });
  }
}
sections.push({ name: '__END__', start: lines.findIndex((l) => l.startsWith('export default')) });

function sliceSection(labelIncludes) {
  const idx = sections.findIndex((s) => s.name.toLowerCase().includes(labelIncludes));
  if (idx < 0) return '';
  const start = sections[idx].start;
  const end = sections[idx + 1]?.start ?? lines.length;
  return lines.slice(start, end).join('\n');
}

const importsHeader = `import { Router } from 'express';
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
`;

const map = [
  { id: 'world', labels: ['worlds'], feature: 'world', critical: true },
  { id: 'player', labels: ['players'], feature: 'player', critical: true },
  { id: 'roleplay', labels: ['roleplay'], feature: 'roleplay', critical: true },
  { id: 'travel', labels: ['travel'], feature: 'travel', critical: false },
  { id: 'quest', labels: ['quest'], feature: 'quest', critical: false },
  // inventory + relationships + dice → rpg
  { id: 'rpg', labels: ['inventory', 'relationships', 'dice'], feature: 'rpg', critical: false },
  { id: 'save', labels: ['save'], feature: 'save', critical: false },
];

// journal is inside travel section in current file - extract journal routes separately by regex
const fullBody = lines.join('\n');

function extractByMarkers(startHint, endHint) {
  const s = sections.findIndex((x) => x.name.toLowerCase().includes(startHint));
  if (s < 0) return '';
  let e = sections.length - 1;
  if (endHint) {
    const ei = sections.findIndex((x, i) => i > s && x.name.toLowerCase().includes(endHint));
    if (ei >= 0) e = ei;
  } else {
    e = s + 1;
  }
  return lines.slice(sections[s].start, sections[e].start).join('\n');
}

const chunks = {
  world: extractByMarkers('worlds', 'players'),
  player: extractByMarkers('players', 'roleplay'),
  roleplay: extractByMarkers('roleplay', 'travel'),
  travel: extractByMarkers('travel', 'quest'),
  quest: extractByMarkers('quest', 'inventory'),
  rpg:
    extractByMarkers('inventory', 'save') ||
    [
      extractByMarkers('inventory', 'relationships'),
      extractByMarkers('relationships', 'dice'),
      extractByMarkers('dice', 'save'),
    ]
      .filter(Boolean)
      .join('\n\n'),
  save: extractByMarkers('save', '__end__') || extractByMarkers('save'),
};

// Fix save section end
if (!chunks.save) {
  const s = sections.findIndex((x) => x.name.toLowerCase().includes('save'));
  if (s >= 0) chunks.save = lines.slice(sections[s].start, sections[sections.length - 1].start).join('\n');
}

// Split journal routes out of travel chunk into journal module
let travelChunk = chunks.travel || '';
let journalChunk = '';
const journalMatch = travelChunk.match(
  /\/\/ =+\n\/\/ Quest log[\s\S]*/i,
);
// journal is between travel and quest in file - check
// From earlier: Travel section includes journal routes before Quest log
const jStart = travelChunk.search(/router\.(get|post)\('\/players\/:id\/journal/);
const dStart = travelChunk.search(/router\.get\('\/players\/:id\/discovery/);
const locStart = travelChunk.search(/router\.get\('\/players\/:id\/location/);
// Keep location with travel; journal+discovery to journal module
if (jStart >= 0) {
  // find quest section start inside travel wrongly included
  const qInTravel = travelChunk.search(/\/\/ =+\n\/\/ Quest log/);
  // discovery and journal
  const beforeJournal = travelChunk.slice(0, jStart);
  // from journal to quest marker or end of discovery block
  const afterTravelCore = travelChunk.slice(jStart);
  // split: journal routes until "// ===" Quest or end
  const questMark = afterTravelCore.search(/\/\/ =+[\s\S]*?Quest log/);
  if (questMark >= 0) {
    journalChunk = afterTravelCore.slice(0, questMark);
    // location endpoint might be after discovery - check
    travelChunk = beforeJournal + afterTravelCore.slice(questMark);
  } else {
    // journal + discovery + maybe location
    const locMark = afterTravelCore.search(/router\.get\('\/players\/:id\/location/);
    if (locMark >= 0) {
      journalChunk = afterTravelCore.slice(0, locMark);
      travelChunk = beforeJournal + afterTravelCore.slice(locMark);
    } else {
      journalChunk = afterTravelCore;
      travelChunk = beforeJournal;
    }
  }
  chunks.travel = travelChunk;
  chunks.journal = journalChunk;
}

for (const [id, body] of Object.entries(chunks)) {
  if (!body || body.length < 20) {
    console.warn('skip empty', id, body?.length);
    continue;
  }
  const dir = path.join(srcRoot, 'modules', id);
  fs.mkdirSync(dir, { recursive: true });
  const content = importsHeader + '\n' + body.trim() + '\n\nexport default router;\n';
  fs.writeFileSync(path.join(dir, 'routes.ts'), content);
  console.log('wrote', id, 'routes', content.length);
}

console.log('done sections', sections.map((s) => s.name));
