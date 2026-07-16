import type { Request, Response, NextFunction } from 'express';
import { isFeatureEnabled, type FeatureId } from '../../config/features';
import { HttpError } from '../../middleware/http-error';
import { isModuleRunnable } from '../runtime/rte';

/**
 * Feature + isolation gate.
 * Disabled features and OPEN circuits both block this SWC only.
 */
export function requireFeature(id: FeatureId) {
  return (_req: Request, _res: Response, next: NextFunction): void => {
    if (!isFeatureEnabled(id)) {
      next(
        HttpError.badRequest(`Feature "${id}" is disabled`, { feature: id, code: 'FEATURE_OFF' }),
      );
      return;
    }
    if (!isModuleRunnable(id)) {
      next(
        new HttpError(
          503,
          `Module "${id}" isolated or not allowed in current mode`,
          'MODULE_ISOLATED',
          {
            feature: id,
          },
        ),
      );
      return;
    }
    next();
  };
}
