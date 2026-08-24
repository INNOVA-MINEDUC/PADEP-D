import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import env from './config/env.js';
import apiRoutes from './routes/index.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const app = express();

// CORS: '*' o lista separada por comas.
const corsOptions = env.corsOrigin === '*'
  ? {}
  : { origin: env.corsOrigin.split(',').map((s) => s.trim()) };

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
if (env.nodeEnv !== 'test') app.use(morgan('dev'));

// Healthcheck sin rate limit.
app.get('/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// API con limitador general.
app.use('/api', apiLimiter, apiRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
