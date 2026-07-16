import type { Request, Response, NextFunction } from 'express';
import { isFeatureEnabled, type FeatureId } from '../../config/features';
import { HttpError } from '../../middleware/http-error';

/** Express middleware — 403 when feature flag is off. */
export function requireFeature(id: FeatureId) {
  return (_req: Request, _res: Response, next: NextFunction): void => {
    if (!isFeatureEnabled(id)) {
      next(
        HttpError.badRequest(`Feature "${id}" is disabled`, { feature: id, code: 'FEATURE_OFF' }),
      );
      return;
    }
    next();
  };
}
