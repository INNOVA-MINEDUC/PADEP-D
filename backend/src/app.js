import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import env from './config/env.js';
import apiRoutes from './routes/index.js';
import extraccionProxy from './routes/extraccion.routes.js';
import { authenticate } from './middleware/auth.js';
import { apiLimiter, extraccionLimiter } from './middleware/rateLimit.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const app = express();

// CORS: '*' o lista separada por comas.
const corsOptions = env.corsOrigin === '*'
  ? {}
  : { origin: env.corsOrigin.split(',').map((s) => s.trim()) };

app.use(cors(corsOptions));
if (env.nodeEnv !== 'test') app.use(morgan('dev'));

// Proxy a la API de extraccion (FastAPI). Va ANTES de los body parsers a
// proposito: los PDF se suben en trozos de 8 MB y el proxy los encana sin
// leerlos, pero en cuanto express.json()/urlencoded() consumen el cuerpo ya no
// queda stream que encanar. Lleva su propio limitador porque el general
// (300 / 15 min) no aguanta una subida troceada mas el sondeo de 2 s.
app.use('/api/extraccion', extraccionLimiter, authenticate, extraccionProxy);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Healthcheck sin rate limit.
app.get('/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// API con limitador general.
app.use('/api', apiLimiter, apiRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
