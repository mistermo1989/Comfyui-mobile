import { env } from '../lib/env.js';

export function requireAppSecret(req, res, next) {
  const supplied = req.get('x-app-secret');
  if (!supplied || supplied !== env.APP_API_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}
