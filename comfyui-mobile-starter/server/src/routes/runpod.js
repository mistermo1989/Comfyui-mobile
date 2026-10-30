import { Router } from 'express';
import { z } from 'zod';
import { runpod } from '../services/runpod.js';

const router = Router();
const idSchema = z.string().min(1).max(128);

router.get('/pods', async (_req, res, next) => {
  try { res.json(await runpod.listPods()); } catch (e) { next(e); }
});

router.get('/pods/:id', async (req, res, next) => {
  try {
    const id = idSchema.parse(req.params.id);
    res.json(await runpod.getPod(id));
  } catch (e) { next(e); }
});

router.post('/pods/:id/start', async (req, res, next) => {
  try {
    const id = idSchema.parse(req.params.id);
    res.json(await runpod.startPod(id));
  } catch (e) { next(e); }
});

router.post('/pods/:id/stop', async (req, res, next) => {
  try {
    const id = idSchema.parse(req.params.id);
    res.json(await runpod.stopPod(id));
  } catch (e) { next(e); }
});

router.delete('/pods/:id', async (req, res, next) => {
  try {
    const id = idSchema.parse(req.params.id);
    res.json(await runpod.terminatePod(id));
  } catch (e) { next(e); }
});

export default router;
