import { Router } from 'express';
import { requireString, asyncHandler } from '../../middleware/validate';
import { HttpError } from '../../middleware/http-error';
import { requireFeature } from '../shared/feature-guard';
import { getPlayer, getWorld } from '../../services/repository';
import { userFromToken } from '../auth/service';
import {
  createShareCode,
  resolveShareCode,
  listShareCodes,
  heartbeatPresence,
  getOnlinePlayers,
  leaveWorld,
} from './service';
import { info } from '../../services/logger';

const router = Router();

function bearer(req: { headers: { authorization?: string } }): string | null {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7).trim() : null;
}

router.post(
  '/worlds/:id/share',
  requireFeature('multiplayer'),
  asyncHandler(async (req, res) => {
    const world = getWorld(req.params.id);
    if (!world) throw HttpError.notFound('World not found');
    const user = userFromToken(bearer(req));
    const code = createShareCode(world.id, user?.id);
    info('multiplayer', `share world=${world.id} code=${code}`);
    res.status(201).json({ code, worldId: world.id, name: world.name });
  }),
);

router.get('/worlds/:id/shares', requireFeature('multiplayer'), (req, res, next) => {
  try {
    if (!getWorld(req.params.id)) throw HttpError.notFound('World not found');
    res.json({ codes: listShareCodes(req.params.id) });
  } catch (e) {
    next(e);
  }
});

router.post(
  '/multiplayer/join',
  requireFeature('multiplayer'),
  asyncHandler(async (req, res) => {
    try {
      const code = requireString(req.body?.code, 'code', { min: 4, max: 16 });
      const { world, share } = resolveShareCode(code);
      res.json({
        worldId: world.id,
        name: world.name,
        description: world.description,
        scale: world.scale,
        locations: world.locations?.length || 0,
        shareCode: share.code,
      });
    } catch (e: any) {
      throw HttpError.badRequest(e.message || 'join failed');
    }
  }),
);

router.post(
  '/players/:id/presence',
  requireFeature('multiplayer'),
  asyncHandler(async (req, res) => {
    const player = getPlayer(req.params.id);
    if (!player) throw HttpError.notFound('Player not found');
    const user = userFromToken(bearer(req));
    const row = heartbeatPresence({
      playerId: player.id,
      worldId: player.worldId,
      playerName: player.name,
      userId: user?.id,
      locationId: player.currentLocationId,
    });
    res.json(row);
  }),
);

router.get('/worlds/:id/online', requireFeature('multiplayer'), (req, res, next) => {
  try {
    if (!getWorld(req.params.id)) throw HttpError.notFound('World not found');
    res.json({ online: getOnlinePlayers(req.params.id) });
  } catch (e) {
    next(e);
  }
});

router.delete('/players/:id/presence', requireFeature('multiplayer'), (req, res) => {
  leaveWorld(req.params.id);
  res.json({ ok: true });
});

export default router;
