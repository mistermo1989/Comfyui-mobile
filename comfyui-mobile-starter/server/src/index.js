import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './lib/env.js';
import { requireAppSecret } from './middleware/auth.js';
import runpodRoutes from './routes/runpod.js';

const app = express();
app.use(helmet());
app.use(cors({ origin: (origin, callback) => {
  const allowed = !origin || origin === 'null' || env.NODE_ENV === 'development' || origin === process.env.APP_ORIGIN;
  callback(null, allowed);
} }));
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'comfyui-mobile-api' }));
app.use('/api', requireAppSecret);
app.use('/api/runpod', runpodRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(env.PORT, () => console.log(`ComfyUI Mobile API listening on :${env.PORT}`));
