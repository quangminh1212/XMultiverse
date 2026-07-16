import type { Request, Response, NextFunction } from 'express';
import { HttpError } from './http-error';
import type { SourceType } from '../types';

const SOURCE_TYPES: SourceType[] = ['story', 'movie', 'book', 'anime', 'original'];

export function requireString(
  value: unknown,
  field: string,
  opts: { min?: number; max?: number } = {},
): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw HttpError.badRequest(`${field} is required`);
  }
  const s = value.trim();
  if (opts.min !== undefined && s.length < opts.min) {
    throw HttpError.badRequest(`${field} must be at least ${opts.min} characters`);
  }
  if (opts.max !== undefined && s.length > opts.max) {
    throw HttpError.badRequest(`${field} must be at most ${opts.max} characters`);
  }
  return s;
}

export function parseSourceType(value: unknown): SourceType {
  if (value === undefined || value === null || value === '') return 'story';
  if (typeof value !== 'string' || !SOURCE_TYPES.includes(value as SourceType)) {
    throw HttpError.badRequest(`sourceType must be one of: ${SOURCE_TYPES.join(', ')}`);
  }
  return value as SourceType;
}

export function parseQuestStatus(value: unknown): 'active' | 'completed' | 'failed' {
  if (value !== 'active' && value !== 'completed' && value !== 'failed') {
    throw HttpError.badRequest('status must be active|completed|failed');
  }
  return value;
}

/** Express wrapper that catches sync validation errors. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void> | void,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
