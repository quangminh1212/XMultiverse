import { Router } from 'express';
import { requireString, asyncHandler } from '../../middleware/validate';
import { HttpError } from '../../middleware/http-error';
import { requireFeature } from '../shared/feature-guard';
import { registerUser, loginUser, userFromToken, logoutToken } from './service';
import { info } from '../../services/logger';

const router = Router();

function bearer(req: { headers: { authorization?: string } }): string | null {
  const h = req.headers.authorization || '';
  if (h.startsWith('Bearer ')) return h.slice(7).trim();
  return null;
}

router.post(
  '/auth/register',
  requireFeature('auth'),
  asyncHandler(async (req, res) => {
    try {
      const username = requireString(req.body?.username, 'username', { min: 3, max: 32 });
      const password = requireString(req.body?.password, 'password', { min: 6, max: 128 });
      const displayName =
        typeof req.body?.displayName === 'string' ? req.body.displayName : undefined;
      const result = registerUser(username, password, displayName);
      info('auth', `register user=${result.user.username}`);
      res.status(201).json(result);
    } catch (e: any) {
      throw HttpError.badRequest(e.message || 'register failed');
    }
  }),
);

router.post(
  '/auth/login',
  requireFeature('auth'),
  asyncHandler(async (req, res) => {
    try {
      const username = requireString(req.body?.username, 'username');
      const password = requireString(req.body?.password, 'password');
      const result = loginUser(username, password);
      info('auth', `login user=${result.user.username}`);
      res.json(result);
    } catch (e: any) {
      throw HttpError.badRequest(e.message || 'login failed');
    }
  }),
);

router.get('/auth/me', requireFeature('auth'), (req, res) => {
  const user = userFromToken(bearer(req));
  if (!user) {
    res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
    return;
  }
  res.json({ user });
});

router.post('/auth/logout', requireFeature('auth'), (req, res) => {
  const token = bearer(req);
  if (token) logoutToken(token);
  res.json({ ok: true });
});

export default router;
