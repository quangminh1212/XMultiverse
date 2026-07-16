/**
 * HTTP isolation boundary per SWC (software component).
 * Uncaught errors in one module router never tear down sibling routers.
 */
import {
  Router,
  type Request,
  type Response,
  type NextFunction,
  type RequestHandler,
} from 'express';
import { isModuleRunnable, rte } from './rte';
import { HttpError } from '../../platform/middleware/http-error';
import { recordFailure } from './watchdog';
import { warn } from '../../platform/logger';

/** Reject requests if SWC circuit is OPEN or mode forbids it. */
export function requireSwc(moduleId: string): RequestHandler {
  return (_req, _res, next) => {
    // meta + runtime always accept traffic for ops recovery
    if (moduleId === 'meta' || moduleId === 'runtime') {
      next();
      return;
    }
    if (!isModuleRunnable(moduleId)) {
      const w = rte.health().modules.find((m) => m.id === moduleId);
      next(
        new HttpError(
          503,
          `Module "${moduleId}" unavailable (health=${w?.health || 'UNKNOWN'}, mode=${rte.getMode()})`,
          'MODULE_ISOLATED',
          { moduleId, health: w?.health, circuit: w?.circuit },
        ),
      );
      return;
    }
    next();
  };
}

/**
 * Wrap a module Router so thrown errors are converted to JSON 5xx
 * without killing the process or other modules' routes.
 */
export function isolateRouter(moduleId: string, router: Router): Router {
  const shell = Router();

  shell.use(requireSwc(moduleId));
  shell.use(router);

  // Error boundary — last middleware for this SWC only
  shell.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      next(err);
      return;
    }

    const status = err instanceof HttpError ? err.status : err?.status || 500;
    const code =
      err instanceof HttpError
        ? err.code
        : err?.code === 'MODULE_TIMEOUT'
          ? 'MODULE_TIMEOUT'
          : err?.code === 'MODULE_ISOLATED'
            ? 'MODULE_ISOLATED'
            : 'MODULE_ERROR';

    if (status >= 500 || code === 'MODULE_TIMEOUT' || code === 'MODULE_ISOLATED') {
      recordFailure(moduleId, err, code === 'MODULE_TIMEOUT' ? 'TIMEOUT' : 'FAILED');
    }

    warn(
      'isolation',
      `SWC=${moduleId} ${req.method} ${req.path} → ${status} ${err?.message || err}`,
    );

    res.status(status >= 400 && status < 600 ? status : 500).json({
      error: err?.message || 'Module error',
      code,
      moduleId,
      isolated: true,
    });
  });

  return shell;
}

/**
 * Express async handler that routes work through RTE.invoke for timeouts.
 */
export function isolatedHandler(
  moduleId: string,
  operation: string,
  fn: (req: Request, res: Response) => Promise<void>,
  timeoutMs?: number,
): RequestHandler {
  return (req, res, next) => {
    rte.invoke(moduleId, operation, () => fn(req, res), { timeoutMs }).catch(next);
  };
}
