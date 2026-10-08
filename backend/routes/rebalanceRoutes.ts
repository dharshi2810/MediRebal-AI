import { Router } from 'express';
import { analyzeDistrictResources } from '../services/rebalanceService';

const router = Router();

router.get('/district-analysis', async (_req, res) => {
  try {
    const analysis = await analyzeDistrictResources();
    res.json(analysis);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to analyze district resources' });
  }
});

export default router;
