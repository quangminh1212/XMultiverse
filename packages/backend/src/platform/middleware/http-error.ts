/**
 * Typed HTTP errors for consistent API responses (RFC 7807-inspired).
 */

export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, message: string, code = 'ERROR', details?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message: string, details?: unknown): HttpError {
    return new HttpError(400, message, 'BAD_REQUEST', details);
  }

  static notFound(message: string): HttpError {
    return new HttpError(404, message, 'NOT_FOUND');
  }

  static conflict(message: string): HttpError {
    return new HttpError(409, message, 'CONFLICT');
  }

  static tooManyRequests(message = 'Too many requests'): HttpError {
    return new HttpError(429, message, 'RATE_LIMITED');
  }
}

export interface ApiErrorBody {
  error: string;
  code: string;
  details?: unknown;
}
