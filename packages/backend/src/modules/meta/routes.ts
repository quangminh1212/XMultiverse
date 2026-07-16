import { Router } from 'express';
import {
  listScales,
  resolveScale,
  parseWorldScaleId,
  defaultScaleId,
} from '../../config/world-scale';
import {
  listFeatures,
  isFeatureEnabled,
  setFeatureEnabled,
  type FeatureId,
} from '../../config/features';
import { getLimits } from '../../config/limits';
import { HttpError } from '../../platform/middleware/http-error';

const router = Router();

/** Public platform configuration for clients / agents. */
router.get('/config', (_req, res) => {
  res.json({
    defaultScale: defaultScaleId(),
    scales: listScales().map((s) => ({
      id: s.id,
      label: s.label,
      description: s.description,
      locationsTarget: s.locationsTarget,
      locationsMax: s.locationsMax,
      questsMax: s.questsMax,
      charactersMax: s.charactersMax,
      factionsMax: s.factionsMax,
      genHint: s.genHint,
    })),
    features: listFeatures(),
    limits: getLimits(defaultScaleId()),
  });
});

router.get('/config/scales', (_req, res) => {
  res.json(listScales());
});

router.get('/config/scales/:id', (req, res) => {
  const id = parseWorldScaleId(req.params.id);
  res.json(resolveScale(id));
});

router.get('/config/features', (_req, res) => {
  res.json(listFeatures());
});

/** Runtime toggle (non-core). Local/dev tuning only. */
router.post('/config/features/:id', (req, res, next) => {
  try {
    const id = req.params.id as FeatureId;
    if (!listFeatures().some((f) => f.id === id)) {
      throw HttpError.badRequest(`Unknown feature: ${id}`);
    }
    const enabled = Boolean(req.body?.enabled);
    setFeatureEnabled(id, enabled);
    res.json({ id, enabled: isFeatureEnabled(id) });
  } catch (e) {
    next(e);
  }
});

export default router;
