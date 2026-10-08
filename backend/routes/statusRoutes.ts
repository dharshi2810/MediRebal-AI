import { Router } from 'express';
import { getDatabaseState, getDb, configureMongoCredentials } from '../db/mongo';
import { getSimulatorStatus } from '../services/simulatorService';

const router = Router();

router.get('/health', async (_req, res) => {
  const dbState = getDatabaseState();
  const simState = getSimulatorStatus();

  let counts: Record<string, number> = {};
  if (dbState.isConnected) {
    try {
      const db = getDb();
      const collections = [
        'hospitals',
        'users',
        'resources',
        'resource_readings',
        'beds',
        'doctors',
        'nurses',
        'appointments',
        'emergency_requests',
        'transfer_requests',
        'predictions',
        'notifications',
        'audit_logs',
      ];

      for (const col of collections) {
        counts[col] = await db.collection(col).countDocuments({});
      }
    } catch (e) {
      counts = { error: -1 };
    }
  } else {
    counts = { notConnected: 0 };
  }

  res.json({
    status: dbState.isConnected ? 'online' : 'database_disconnected',
    platform: 'MEDIREBAL AI - Healthcare Coordination Platform',
    track: 'HN-AI-05: Cross-Hospital Resource Rebalance',
    database: {
      name: 'medirebal',
      isConnectedToAtlas: dbState.isConnectedToAtlas,
      mode: dbState.isConnectedToAtlas ? 'MongoDB Atlas Live (medirebal)' : 'Disconnected from MongoDB Atlas',
      notice: dbState.atlasNotice,
      error: dbState.error,
      collectionsCount: counts,
    },
    gemini: {
      isKeyConfigured: !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY',
      model: 'gemini-3.8-flash',
    },
    simulator: simState,
    timestamp: new Date().toISOString(),
  });
});

router.post('/configure-connection', async (req, res) => {
  try {
    const { password, uri } = req.body;
    if (!password && !uri) {
      return res.status(400).json({ error: 'Please provide a password or full MongoDB URI' });
    }

    const result = await configureMongoCredentials({ password, uri });
    res.json({
      message: 'Successfully connected to MongoDB Atlas (medirebal)!',
      database: 'connected',
      databaseName: 'medirebal',
      state: result.state,
    });
  } catch (err: any) {
    res.status(500).json({
      error: err.message || 'Failed to connect with provided credentials',
      details: err.stack,
    });
  }
});

router.post('/retry-atlas', async (_req, res) => {
  try {
    const { connectToDatabase } = await import('../db/mongo');
    await connectToDatabase(true);
    res.json({ message: 'Retried MongoDB Atlas connection', state: getDatabaseState() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/audit-logs', async (_req, res) => {
  try {
    const db = getDb();
    const logs = await db.collection('audit_logs').find({}).sort({ timestamp: -1 }).limit(50).toArray();
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch audit logs' });
  }
});

export default router;
