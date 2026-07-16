/**
 * V2 features smoke: auth, multiplayer, marketplace, streaming.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Server } from 'http';
import type { AddressInfo } from 'net';
import { existsSync, unlinkSync } from 'fs';

process.env.DEMO_MODE = 'true';
process.env.DB_PATH = './data/v2-smoke.db';
if (existsSync('./data/v2-smoke.db')) unlinkSync('./data/v2-smoke.db');

const { default: app } = await import('../app');

let server: Server;
let base = '';

async function api(path: string, init?: RequestInit & { token?: string }) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as any),
  };
  if (init?.token) headers.Authorization = `Bearer ${init.token}`;
  const res = await fetch(`${base}${path}`, { ...init, headers });
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

describe('v2 platform features', () => {
  let token = '';
  let worldId = '';
  let playerId = '';
  let packId = '';

  it('auth register + me', async () => {
    const reg = await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        username: `hero${Date.now().toString(36)}`,
        password: 'secret12',
        displayName: 'Hero',
      }),
    });
    expect(reg.status).toBe(201);
    expect(reg.data.token).toBeTruthy();
    token = reg.data.token;
    const me = await api('/api/auth/me', { token });
    expect(me.status).toBe(200);
    expect(me.data.user.displayName).toBe('Hero');
  });

  it('create world + share code + presence', async () => {
    const w = await api('/api/worlds', {
      method: 'POST',
      body: JSON.stringify({
        story: 'Space crew lost near wormhole with rebellious AI',
        sourceType: 'movie',
        scale: 'compact',
      }),
    });
    expect(w.status).toBe(201);
    worldId = w.data.id;

    const share = await api(`/api/worlds/${worldId}/share`, { method: 'POST', token });
    expect(share.status).toBe(201);
    expect(share.data.code).toMatch(/^[A-F0-9]+$/i);

    const join = await api('/api/multiplayer/join', {
      method: 'POST',
      body: JSON.stringify({ code: share.data.code }),
    });
    expect(join.status).toBe(200);
    expect(join.data.worldId).toBe(worldId);

    const p = await api(`/api/worlds/${worldId}/players`, {
      method: 'POST',
      body: JSON.stringify({ name: 'Nova', role: 'Pilot' }),
    });
    expect(p.status).toBe(201);
    playerId = p.data.id;

    const beat = await api(`/api/players/${playerId}/presence`, { method: 'POST', token });
    expect(beat.status).toBe(200);

    const online = await api(`/api/worlds/${worldId}/online`);
    expect(online.status).toBe(200);
    expect(online.data.online.some((x: any) => x.playerId === playerId)).toBe(true);
  });

  it('marketplace publish + install', async () => {
    const pub = await api('/api/market/publish', {
      method: 'POST',
      token,
      body: JSON.stringify({
        worldId,
        title: 'Wormhole Station Pack',
        tags: ['scifi', 'demo'],
      }),
    });
    expect(pub.status).toBe(201);
    packId = pub.data.id;

    const list = await api('/api/market/packs');
    expect(list.status).toBe(200);
    expect(list.data.packs.some((p: any) => p.id === packId)).toBe(true);

    const inst = await api(`/api/market/packs/${packId}/install`, { method: 'POST' });
    expect(inst.status).toBe(201);
    expect(inst.data.id).not.toBe(worldId);
    expect(inst.data.name).toBeTruthy();
  });

  it('streaming act returns SSE tokens + done', async () => {
    const res = await fetch(`${base}/api/players/${playerId}/act/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'Kham pha xung quanh' }),
    });
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('data:');
    expect(text).toContain('"type":"token"');
    expect(text).toContain('"type":"done"');
  });
});
