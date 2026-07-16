import { describe, it, expect, beforeEach } from 'vitest';
import {
  guardedRun,
  recordFailure,
  recordSuccess,
  resetWatch,
  getWatch,
  isCircuitAvailable,
  configureWatchdog,
} from './watchdog';
import { setMode, getMode, isModuleAllowedInMode, PLATFORM_MODES } from './modes';
import { rte, isModuleRunnable } from './rte';

describe('AUTOSAR-inspired isolation runtime', () => {
  beforeEach(() => {
    setMode('full', 'test-reset');
    configureWatchdog({ failureThreshold: 2, openMs: 50, defaultTimeoutMs: 100 });
    for (const id of ['modA', 'modB', 'marketplace', 'roleplay']) {
      resetWatch(id);
    }
  });

  it('modes deny optional modules in core', () => {
    setMode('core');
    expect(isModuleAllowedInMode('world')).toBe(true);
    expect(isModuleAllowedInMode('marketplace')).toBe(false);
    expect(PLATFORM_MODES.core.deny).toContain('marketplace');
  });

  it('circuit opens after threshold failures and isolates module', async () => {
    resetWatch('modA');
    recordFailure('modA', new Error('boom1'));
    expect(isCircuitAvailable('modA')).toBe(true);
    recordFailure('modA', new Error('boom2'));
    expect(getWatch('modA').circuit).toBe('OPEN');
    expect(isCircuitAvailable('modA')).toBe(false);

    await expect(guardedRun('modA', async () => 'ok')).rejects.toThrow(/circuit OPEN/);
  });

  it('timeout isolates only the hung call', async () => {
    resetWatch('modB');
    configureWatchdog({ failureThreshold: 1, defaultTimeoutMs: 30, openMs: 10_000 });
    await expect(
      guardedRun('modB', () => new Promise((r) => setTimeout(r, 200)), 30),
    ).rejects.toThrow(/timeout/);
    expect(getWatch('modB').health).toMatch(/TIMEOUT|OPEN|FAILED/);
  });

  it('sibling module stays CLOSED when another fails', () => {
    resetWatch('modA');
    resetWatch('modB');
    recordFailure('modA', 'x');
    recordFailure('modA', 'y');
    expect(getWatch('modA').circuit).toBe('OPEN');
    expect(getWatch('modB').circuit).toBe('CLOSED');
    expect(isCircuitAvailable('modB')).toBe(true);
  });

  it('success closes circuit after recovery window', async () => {
    configureWatchdog({ failureThreshold: 1, openMs: 20, defaultTimeoutMs: 500 });
    resetWatch('modA');
    recordFailure('modA', 'fail');
    expect(getWatch('modA').circuit).toBe('OPEN');
    await new Promise((r) => setTimeout(r, 25));
    // HALF_OPEN then success
    recordSuccess('modA', 5);
    expect(getWatch('modA').circuit).toBe('CLOSED');
  });

  it('rte.invoke records success', async () => {
    rte.registerSwc({ id: 'modB', name: 'B' });
    resetWatch('modB');
    const v = await rte.invoke('modB', 'ping', async () => 42);
    expect(v).toBe(42);
    expect(getWatch('modB').successes).toBeGreaterThan(0);
  });

  it('isModuleRunnable respects mode deny list', () => {
    setMode('core');
    resetWatch('marketplace');
    expect(isModuleRunnable('marketplace')).toBe(false);
    setMode('full');
    expect(isModuleRunnable('marketplace')).toBe(true);
  });

  it('getMode reflects setMode', () => {
    setMode('safe');
    expect(getMode()).toBe('safe');
    setMode('full');
    expect(getMode()).toBe('full');
  });
});
