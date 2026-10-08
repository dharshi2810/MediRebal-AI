import { Router } from 'express';
import { getDb } from '../db/mongo';
import { AuthenticatedRequest, authMiddleware, requireHospitalAdmin, requireSpecificHospital, logAudit } from '../middleware/authMiddleware';
import { predictHospitalShortage } from '../services/mlPredictionService';

const router = Router();

// Get all resources
router.get('/', async (_req, res) => {
  try {
    const db = getDb();
    const resources = await db.collection('resources').find({}).toArray();
    res.json(resources);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch resources' });
  }
});

// Get resources for a specific hospital
router.get('/:hospitalId', async (req, res) => {
  try {
    const { hospitalId } = req.params;
    const db = getDb();
    const resources = await db.collection('resources').find({ hospital_id: hospitalId }).toArray();
    res.json(resources);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch hospital resources' });
  }
});

// Update resource stock (Admin only)
router.put('/:hospitalId', authMiddleware, requireHospitalAdmin, requireSpecificHospital('hospitalId'), async (req: AuthenticatedRequest, res) => {
  try {
    const { hospitalId } = req.params;
    const {
      resource_type = 'oxygen_cylinders',
      current_stock,
      available_oxygen,
      total_stock,
      total_oxygen,
      status,
      critical_threshold,
      daily_consumption,
    } = req.body;

    const rawStock = current_stock !== undefined ? current_stock : available_oxygen;
    if (rawStock === undefined && total_stock === undefined && total_oxygen === undefined && status === undefined) {
      return res.status(400).json({ error: 'At least one field (current_stock/available_oxygen, total_stock, or status) is required' });
    }

    const db = getDb();
    const existing = await db.collection('resources').findOne({ hospital_id: hospitalId, resource_type });

    const stockVal = rawStock !== undefined ? Math.max(0, parseInt(rawStock)) : (existing?.current_stock ?? 45);
    const totalVal = (total_stock !== undefined ? parseInt(total_stock) : undefined) ??
                     (total_oxygen !== undefined ? parseInt(total_oxygen) : undefined) ??
                     (existing?.total_stock ?? 200);

    let statusVal = status;
    if (!statusVal) {
      statusVal = stockVal <= 30 ? 'Critical' : stockVal <= 60 ? 'Low' : stockVal <= 100 ? 'Limited' : 'Good';
    }

    const updateDoc: any = {
      current_stock: stockVal,
      total_stock: totalVal,
      status: statusVal,
      updated_at: new Date().toISOString(),
    };

    if (critical_threshold !== undefined) {
      updateDoc.critical_threshold = parseInt(critical_threshold);
    }
    if (daily_consumption !== undefined) {
      updateDoc.daily_consumption = parseFloat(daily_consumption);
      updateDoc.consumption_rate = -Math.round((parseFloat(daily_consumption) / 24) * 100) / 100;
    }

    await db.collection('resources').updateOne(
      { hospital_id: hospitalId, resource_type },
      { $set: updateDoc },
      { upsert: true }
    );

    // Save reading in historical readings collection
    await db.collection('resource_readings').insertOne({
      hospital_id: hospitalId,
      resource_type,
      quantity: stockVal,
      timestamp: new Date().toISOString(),
    });

    // Update hospital overview
    if (resource_type === 'oxygen_cylinders') {
      const hospStatusMap: Record<string, string> = {
        Critical: 'critical',
        Low: 'high_risk',
        Limited: 'limited',
        Good: 'healthy',
      };
      const hospitalUpdate: any = {
        'overview.oxygen_cylinders': stockVal,
        'overview.total_oxygen': totalVal,
        'overview.oxygen_status': statusVal,
      };
      if (hospStatusMap[statusVal]) {
        hospitalUpdate.status = hospStatusMap[statusVal];
      }

      await db.collection('hospitals').updateOne(
        { hospital_id: hospitalId },
        { $set: hospitalUpdate }
      );

      // Re-run ML prediction
      await predictHospitalShortage(hospitalId).catch(() => {});
    } else if (resource_type === 'ventilators') {
      await db.collection('hospitals').updateOne(
        { hospital_id: hospitalId },
        { $set: { 'overview.ventilators': stockVal } }
      );
    }

    await logAudit(req.user!.email, req.user!.role, 'UPDATE_RESOURCE', hospitalId, { resource_type, stockVal, totalVal, statusVal });

    res.json({
      message: 'Oxygen availability updated successfully.',
      current_stock: stockVal,
      total_stock: totalVal,
      status: statusVal,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update resource' });
  }
});

// Get historical readings for charts
router.get('/history/:hospitalId', async (req, res) => {
  try {
    const { hospitalId } = req.params;
    const { resourceType = 'oxygen_cylinders', limit = 50 } = req.query;

    const db = getDb();
    const readings = await db
      .collection('resource_readings')
      .find({ hospital_id: hospitalId, resource_type: resourceType as string })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit as string))
      .toArray();

    res.json(readings.reverse());
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch historical readings' });
  }
});

export default router;
