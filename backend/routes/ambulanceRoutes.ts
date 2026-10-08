import { Router } from 'express';
import { getDb } from '../db/mongo';
import { AuthenticatedRequest, authMiddleware, requireHospitalAdmin, logAudit } from '../middleware/authMiddleware';
import { buildIdFilter } from '../utils/mongoHelper';

const router = Router();

// Get ambulances for a hospital
router.get('/:hospitalId', async (req, res) => {
  try {
    const { hospitalId } = req.params;
    const db = getDb();
    const ambulances = await db.collection('ambulances').find({ hospital_id: hospitalId }).toArray();
    res.json(ambulances);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch ambulances' });
  }
});

// Add ambulance
router.post('/', authMiddleware, requireHospitalAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { hospital_id, ambulance_id, driver_name, phone, status } = req.body;
    if (!hospital_id || !ambulance_id || !driver_name) {
      return res.status(400).json({ error: 'hospital_id, ambulance_id, and driver_name are required' });
    }
    const db = getDb();
    const newAmb = {
      hospital_id,
      ambulance_id: ambulance_id.trim(),
      driver_name: driver_name.trim(),
      phone: phone || '',
      status: status || 'Available',
    };
    const result = await db.collection('ambulances').insertOne(newAmb);

    // Update hospital overview
    const availCount = await db.collection('ambulances').countDocuments({
      hospital_id,
      status: { $in: ['Available', 'available'] },
    });
    await db.collection('hospitals').updateOne(
      { hospital_id },
      { $set: { 'overview.ambulances_available': availCount } }
    );

    await logAudit(req.user!.email, req.user!.role, 'ADD_AMBULANCE', hospital_id, { ambulance_id });
    res.status(201).json({ message: 'Ambulance registered successfully.', ambulance: { ...newAmb, _id: result.insertedId } });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to register ambulance' });
  }
});

// Update ambulance (Edit or change status)
router.put('/:id', authMiddleware, requireHospitalAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const idFilter = buildIdFilter(id);
    const existing = await db.collection('ambulances').findOne(idFilter);
    if (!existing) {
      return res.status(404).json({ error: 'Ambulance not found' });
    }

    await db.collection('ambulances').updateOne(idFilter, { $set: req.body });

    const hid = existing.hospital_id;
    // Update hospital overview available count
    const availCount = await db.collection('ambulances').countDocuments({
      hospital_id: hid,
      status: { $in: ['Available', 'available'] },
    });
    await db.collection('hospitals').updateOne(
      { hospital_id: hid },
      { $set: { 'overview.ambulances_available': availCount } }
    );

    await logAudit(req.user!.email, req.user!.role, 'UPDATE_AMBULANCE', hid, { ambulanceId: id, update: req.body });
    res.json({ message: 'Ambulance updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update ambulance' });
  }
});

// Delete ambulance
router.delete('/:id', authMiddleware, requireHospitalAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const idFilter = buildIdFilter(id);
    const existing = await db.collection('ambulances').findOne(idFilter);
    if (!existing) {
      return res.status(404).json({ error: 'Ambulance not found' });
    }

    const hid = existing.hospital_id;
    await db.collection('ambulances').deleteOne(idFilter);

    // Update hospital overview available count
    const availCount = await db.collection('ambulances').countDocuments({
      hospital_id: hid,
      status: { $in: ['Available', 'available'] },
    });
    await db.collection('hospitals').updateOne(
      { hospital_id: hid },
      { $set: { 'overview.ambulances_available': availCount } }
    );

    await logAudit(req.user!.email, req.user!.role, 'DELETE_AMBULANCE', hid, { ambulanceId: id });
    res.json({ message: 'Ambulance removed successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete ambulance' });
  }
});

export default router;
