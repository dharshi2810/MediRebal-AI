import { Router } from 'express';
import { predictHospitalShortage, getAllHospitalPredictions } from '../services/mlPredictionService';
import { getDb } from '../db/mongo';

const router = Router();

// Get predictions for all hospitals
router.get('/', async (_req, res) => {
  try {
    const predictions = await getAllHospitalPredictions();
    res.json(predictions);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to calculate predictions' });
  }
});

// Get prediction for specific hospital
router.get('/:hospitalId', async (req, res) => {
  try {
    const { hospitalId } = req.params;
    const prediction = await predictHospitalShortage(hospitalId);
    res.json(prediction);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to predict for hospital' });
  }
});

// Force recalculate
router.post('/', async (req, res) => {
  try {
    const { hospital_id } = req.body;
    if (hospital_id) {
      const pred = await predictHospitalShortage(hospital_id);
      return res.json(pred);
    }
    const all = await getAllHospitalPredictions();
    res.json(all);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to recalculate predictions' });
  }
});

export default router;
