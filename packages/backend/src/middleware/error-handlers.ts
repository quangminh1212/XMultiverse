import type { Request, Response, NextFunction } from 'express';
import { warn, error as logError } from '../services/logger';

export function notFoundHandler(req: Request, res: Response): void {
  warn('http', `404 ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Không tìm thấy endpoint' });
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  logError('http', `${req.method} ${req.path} → 500: ${err.message}`);
  logError('http', `Stack: ${err.stack || '(no stack)'}`);
  res.status(500).json({ error: err.message || 'Lỗi server nội bộ' });
}
