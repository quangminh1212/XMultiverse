import type { Request, Response, NextFunction } from 'express';

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: 'Không tìm thấy endpoint' });
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error('[error]', err.message);
  res.status(500).json({ error: err.message || 'Lỗi server nội bộ' });
}
