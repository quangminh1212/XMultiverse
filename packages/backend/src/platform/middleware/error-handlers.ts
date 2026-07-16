import type { Request, Response, NextFunction } from 'express';
import { warn, error as logError } from '../logger';
import { HttpError, type ApiErrorBody } from './http-error';

export function notFoundHandler(req: Request, res: Response): void {
  warn('http', `404 ${req.method} ${req.path}`);
  const body: ApiErrorBody = {
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
  };
  res.status(404).json(body);
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof HttpError) {
    warn('http', `${req.method} ${req.path} → ${err.status}: ${err.message}`);
    const body: ApiErrorBody = {
      error: err.message,
      code: err.code,
    };
    if (err.details !== undefined) body.details = err.details;
    res.status(err.status).json(body);
    return;
  }

  logError('http', `${req.method} ${req.path} → 500: ${err.message}`);
  logError('http', `Stack: ${err.stack || '(no stack)'}`);

  const isProd = process.env.NODE_ENV === 'production';
  const body: ApiErrorBody = {
    error: isProd ? 'Internal server error' : err.message || 'Internal server error',
    code: 'INTERNAL_ERROR',
  };
  res.status(500).json(body);
}
