import { Router } from 'express';
import {
  getSimulatorStatus,
  startSimulation,
  pauseSimulation,
  resetSimulation,
  tickSimulation,
} from '../services/simulatorService';

const router = Router();

router.get('/status', (_req, res) => {
  res.json(getSimulatorStatus());
});

router.post('/start', (req, res) => {
  const { speed = 3500 } = req.body;
  const status = startSimulation(parseInt(speed));
  res.json({ message: 'Simulation started', status });
});

router.post('/pause', (_req, res) => {
  const status = pauseSimulation();
  res.json({ message: 'Simulation paused', status });
});

router.post('/reset', async (_req, res) => {
  const status = await resetSimulation();
  res.json({ message: 'Simulation reset to baseline demo conditions', status });
});

router.post('/tick', async (_req, res) => {
  await tickSimulation();
  res.json({ message: 'Simulation stepped 1 tick', status: getSimulatorStatus() });
});

export default router;
