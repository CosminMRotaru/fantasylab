import { Router } from 'express';
import { getCache, setCache } from '../utils/cache.js';

const router = Router();

router.get('/health', (_req, res) => res.json({ ok: true }));

router.get('/version', (_req, res) => {
  const version = getCache('version') || { api: '1.0.0' };
  if (!getCache('version')) setCache('version', version, 60_000);
  res.json(version);
});

export default router;