import express from 'express';
import cors from 'cors';
import { createApiRouter } from './modules';
import { notFoundHandler, errorHandler } from './middleware/error-handlers';
import { rateLimit } from './middleware/rate-limit';
import { config } from './config';
import { defaultScaleId } from './config/world-scale';

const app = express();

// Trust proxy when behind reverse proxy (rate-limit IP accuracy)
if (process.env.TRUST_PROXY === 'true' || process.env.TRUST_PROXY === '1') {
  app.set('trust proxy', 1);
}

// Security headers (manual lightweight set — no heavy helmet dependency lock-in)
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '256kb' }));

// Global API rate limit (configurable)
const rlMax = Number(process.env.RATE_LIMIT_MAX) || 180;
const rlWindow = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000;
app.use('/api', rateLimit({ max: rlMax, windowMs: rlWindow, keyPrefix: 'api' }));

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    demoMode: config.ai.demoMode,
    version: process.env.npm_package_version || '1.3.0',
    uptime: Math.floor(process.uptime()),
    defaultScale: defaultScaleId(),
    modular: true,
  });
});

app.use('/api', createApiRouter());

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
