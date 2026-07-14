import express from 'express';
import cors from 'cors';
import apiRouter from './routes/api';
import { notFoundHandler, errorHandler } from './middleware/error-handlers';
import { config } from './config';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', demoMode: config.ai.demoMode });
});

app.use('/api', apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
