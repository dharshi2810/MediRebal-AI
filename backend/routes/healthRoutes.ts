import { Router } from 'express';
import { getDatabaseState, getDb } from '../db/mongo';

const router = Router();

router.get('/', async (_req, res) => {
  const dbState = getDatabaseState();

  try {
    const db = getDb();
    // Verify actual database by performing a live ping
    await db.command({ ping: 1 });

    return res.json({
      status: 'ok',
      database: 'connected',
      databaseName: 'medirebal',
    });
  } catch (err: any) {
    return res.status(503).json({
      status: 'error',
      database: 'disconnected',
      databaseName: 'medirebal',
      error: err.message || dbState.error || 'Database is not connected',
    });
  }
});

export default router;
