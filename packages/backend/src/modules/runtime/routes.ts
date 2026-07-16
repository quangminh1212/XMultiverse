import { Router } from 'express';
import { rte } from './rte';
import { listModes, setMode, type PlatformMode, PLATFORM_MODES } from './modes';
import { resetWatch } from './watchdog';
import { HttpError } from '../../middleware/http-error';
import { info } from '../../services/logger';

const router = Router();

/** Full runtime health map (per-SWC isolation status). */
router.get('/runtime/health', (_req, res) => {
  res.json({
    status: 'ok',
    architecture: 'autosar-inspired-swc-isolation',
    ...rte.health(),
  });
});

router.get('/runtime/modes', (_req, res) => {
  res.json({ current: rte.getMode(), modes: listModes() });
});

router.post('/runtime/modes/:mode', (req, res, next) => {
  try {
    const mode = req.params.mode as PlatformMode;
    if (!PLATFORM_MODES[mode]) throw HttpError.badRequest(`Unknown mode: ${mode}`);
    setMode(mode, 'api');
    info('runtime', `mode set → ${mode}`);
    res.json(rte.health().mode);
  } catch (e) {
    next(e);
  }
});

/** Manually reset a SWC circuit (ops recovery). */
router.post('/runtime/modules/:id/reset', (req, res) => {
  resetWatch(req.params.id);
  res.json({ ok: true, watch: rte.health().modules.find((m) => m.id === req.params.id) });
});

router.post('/runtime/modules/:id/disable', (req, res) => {
  rte.disableModule(req.params.id);
  res.json({ ok: true });
});

export default router;
