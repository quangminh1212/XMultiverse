/**
 * AUTOSAR-inspired Mode Manager.
 * Each mode defines which software components (modules) may run.
 */

export type PlatformMode = 'full' | 'core' | 'degraded' | 'safe';

export interface ModeDefinition {
  id: PlatformMode;
  label: string;
  description: string;
  /** Modules allowed in this mode (empty = all feature-flagged). */
  allow: string[] | '*';
  /** Modules always forced off in this mode. */
  deny: string[];
}

export const PLATFORM_MODES: Record<PlatformMode, ModeDefinition> = {
  full: {
    id: 'full',
    label: 'Full',
    description: 'All enabled modules run independently under isolation.',
    allow: '*',
    deny: [],
  },
  core: {
    id: 'core',
    label: 'Core only',
    description: 'World, player, roleplay, travel, save — optional modules off.',
    allow: [
      'meta',
      'game',
      'world',
      'player',
      'roleplay',
      'travel',
      'quest',
      'rpg',
      'save',
      'journal',
      'discovery',
      'timeline',
    ],
    deny: ['marketplace', 'multiplayer', 'streaming', 'auth'],
  },
  degraded: {
    id: 'degraded',
    label: 'Degraded',
    description: 'Auto mode when non-core modules fail; core continues.',
    allow: [
      'meta',
      'game',
      'world',
      'player',
      'roleplay',
      'travel',
      'quest',
      'rpg',
      'save',
      'journal',
      'discovery',
      'auth',
    ],
    deny: [],
  },
  safe: {
    id: 'safe',
    label: 'Safe',
    description: 'Read-mostly / minimal surface after critical faults.',
    allow: ['meta', 'game', 'world', 'player'],
    deny: ['marketplace', 'multiplayer', 'streaming', 'rpg', 'auth'],
  },
};

let currentMode: PlatformMode =
  (process.env.XMV_MODE as PlatformMode) && PLATFORM_MODES[process.env.XMV_MODE as PlatformMode]
    ? (process.env.XMV_MODE as PlatformMode)
    : 'full';

/** Auto-entered degraded (not manual override). */
let autoDegraded = false;

export function getMode(): PlatformMode {
  return currentMode;
}

export function getModeDefinition(): ModeDefinition {
  return PLATFORM_MODES[currentMode];
}

export function setMode(mode: PlatformMode, reason = 'manual'): void {
  if (!PLATFORM_MODES[mode]) throw new Error(`Unknown mode: ${mode}`);
  currentMode = mode;
  if (mode !== 'degraded') autoDegraded = false;
  // eslint-disable-next-line no-console
  console.info(`[mode] → ${mode} (${reason})`);
}

export function enterDegraded(reason: string): void {
  if (currentMode === 'safe' || currentMode === 'core') return;
  if (currentMode === 'full') {
    autoDegraded = true;
    setMode('degraded', reason);
  }
}

export function isModuleAllowedInMode(moduleId: string): boolean {
  const def = PLATFORM_MODES[currentMode];
  if (def.deny.includes(moduleId)) return false;
  if (def.allow === '*') return true;
  return def.allow.includes(moduleId);
}

export function listModes(): ModeDefinition[] {
  return Object.values(PLATFORM_MODES);
}

export function modeStatus() {
  return {
    mode: currentMode,
    autoDegraded,
    definition: getModeDefinition(),
  };
}
