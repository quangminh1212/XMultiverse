import { Router } from 'express';
import { requireString, asyncHandler } from '../../middleware/validate';
import { HttpError } from '../../middleware/http-error';
import { requireFeature } from '../shared/feature-guard';
import { userFromToken } from '../auth/service';
import { publishWorldToMarket, browseMarket, getMarketListing, installMarketPack } from './service';
import { info } from '../../services/logger';

const router = Router();

function bearer(req: { headers: { authorization?: string } }): string | null {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7).trim() : null;
}

router.get('/market/packs', requireFeature('marketplace'), (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q : undefined;
  res.json({ packs: browseMarket(q) });
});

router.get('/market/packs/:id', requireFeature('marketplace'), (req, res, next) => {
  try {
    const pack = getMarketListing(req.params.id);
    if (!pack) throw HttpError.notFound('Pack not found');
    res.json(pack);
  } catch (e) {
    next(e);
  }
});

router.post(
  '/market/publish',
  requireFeature('marketplace'),
  asyncHandler(async (req, res) => {
    try {
      const worldId = requireString(req.body?.worldId, 'worldId');
      const user = userFromToken(bearer(req));
      const author =
        (typeof req.body?.author === 'string' && req.body.author.trim()) ||
        user?.displayName ||
        'Anonymous';
      const meta = publishWorldToMarket({
        worldId,
        author,
        title: req.body?.title,
        description: req.body?.description,
        tags: Array.isArray(req.body?.tags) ? req.body.tags.map(String) : undefined,
      });
      info('market', `publish pack=${meta.slug} world=${worldId}`);
      res.status(201).json(meta);
    } catch (e: any) {
      throw HttpError.badRequest(e.message || 'publish failed');
    }
  }),
);

router.post(
  '/market/packs/:id/install',
  requireFeature('marketplace'),
  asyncHandler(async (req, res) => {
    try {
      const world = installMarketPack(req.params.id);
      info('market', `install pack=${req.params.id} → world=${world.id}`);
      res.status(201).json(world);
    } catch (e: any) {
      throw HttpError.badRequest(e.message || 'install failed');
    }
  }),
);

export default router;
