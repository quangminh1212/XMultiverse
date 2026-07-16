/**
 * End-to-end API smoke — full open-world loop against real Express app.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Server } from 'http';
import type { AddressInfo } from 'net';
import { existsSync, unlinkSync } from 'fs';

process.env.DEMO_MODE = 'true';
process.env.DB_PATH = './data/smoke-e2e.db';
process.env.PORT = '0';

// Fresh DB each run
const DB = './data/smoke-e2e.db';
if (existsSync(DB)) unlinkSync(DB);

// Dynamic import after env
const { default: app } = await import('./app');

let server: Server;
let base = '';

async function api(path: string, init?: RequestInit) {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address() as AddressInfo;
      base = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

describe('platform smoke E2E', () => {
  it('health + config expose scales and modules', async () => {
    const h = await api('/health');
    expect(h.status).toBe(200);
    expect(h.data.status).toBe('ok');
    expect(h.data.modular).toBe(true);

    const c = await api('/api/config');
    expect(c.status).toBe(200);
    expect(c.data.scales?.length).toBeGreaterThanOrEqual(4);
    expect(c.data.features?.length).toBeGreaterThan(0);
  });

  it('full open-world loop: create → player → travel → act → export', async () => {
    const created = await api('/api/worlds', {
      method: 'POST',
      body: JSON.stringify({
        story: 'A knight seeks a divine sword to defeat the demon lord in dark forests',
        sourceType: 'story',
        scale: 'standard',
      }),
    });
    expect(created.status).toBe(201);
    expect(created.data.id).toBeTruthy();
    expect(created.data.locations?.length).toBeGreaterThanOrEqual(5);
    expect(created.data.scale).toBe('standard');
    const worldId = created.data.id as string;

    const playerRes = await api(`/api/worlds/${worldId}/players`, {
      method: 'POST',
      body: JSON.stringify({ name: 'Kael', role: 'Warrior', backstory: 'Test hero' }),
    });
    expect(playerRes.status).toBe(201);
    const playerId = playerRes.data.id as string;
    expect(playerRes.data.currentLocationId).toBeTruthy();
    expect(playerRes.data.visitedLocations?.length).toBeGreaterThanOrEqual(1);

    const locs = created.data.locations as { id: string; name: string; connections: string[] }[];
    const start = locs.find((l) => l.id === playerRes.data.currentLocationId) || locs[0];
    const destName = start.connections?.[0];
    const dest = locs.find((l) => l.name === destName) || locs.find((l) => l.id !== start.id);

    if (dest) {
      const travel = await api(`/api/players/${playerId}/travel`, {
        method: 'POST',
        body: JSON.stringify({ locationId: dest.id }),
      });
      expect(travel.status).toBe(200);
      expect(travel.data.location?.id).toBe(dest.id);
      expect(travel.data.player?.currentLocationId).toBe(dest.id);
    }

    const act = await api(`/api/players/${playerId}/act`, {
      method: 'POST',
      body: JSON.stringify({ action: 'Kham pha xung quanh' }),
    });
    expect(act.status).toBe(200);
    expect(act.data.scene).toBeTruthy();
    expect(act.data.choices?.length).toBeGreaterThan(0);

    const pack = await api(`/api/worlds/${worldId}/export`);
    expect(pack.status).toBe(200);
    expect(pack.data.format).toBe('xmultiverse-world-v1');

    const imported = await api('/api/worlds/import', {
      method: 'POST',
      body: JSON.stringify(pack.data),
    });
    expect(imported.status).toBe(201);
    expect(imported.data.id).not.toBe(worldId);
    expect(imported.data.name).toBe(created.data.name);
  });

  it('expansive scale yields larger location graph', async () => {
    const compact = await api('/api/worlds', {
      method: 'POST',
      body: JSON.stringify({
        story: 'Detective rain city noir mystery case',
        sourceType: 'story',
        scale: 'compact',
      }),
    });
    const expansive = await api('/api/worlds', {
      method: 'POST',
      body: JSON.stringify({
        story: 'Space station wormhole AI colony crisis',
        sourceType: 'movie',
        scale: 'expansive',
      }),
    });
    expect(compact.status).toBe(201);
    expect(expansive.status).toBe(201);
    expect(expansive.data.locations.length).toBeGreaterThan(compact.data.locations.length);
  });
});
