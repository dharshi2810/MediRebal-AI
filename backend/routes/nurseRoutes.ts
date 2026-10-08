import { Router } from 'express';
import { getDb } from '../db/mongo';
import { AuthenticatedRequest, authMiddleware, requireHospitalAdmin, logAudit } from '../middleware/authMiddleware';
import { buildIdFilter } from '../utils/mongoHelper';

const router = Router();

// Get nurses
router.get('/:hospitalId', async (req, res) => {
  try {
    const { hospitalId } = req.params;
    const db = getDb();
    const nurses = await db.collection('nurses').find({ hospital_id: hospitalId }).toArray();
    res.json(nurses);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch nurses' });
  }
});

// Add nurse
router.post('/', authMiddleware, requireHospitalAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { hospital_id, name, department, shift, phone, status, category } = req.body;
    if (!hospital_id || !name) {
      return res.status(400).json({ error: 'hospital_id and name are required' });
    }

    const db = getDb();
    const newNurse = {
      hospital_id,
      name: name.trim(),
      department: department || 'General Ward',
      shift: shift || 'Morning',
      phone: phone || '',
      category: category || 'general',
      status: status || 'Available',
    };

    const result = await db.collection('nurses').insertOne(newNurse);

    // Sync count in hospitals collection
    const availCount = await db.collection('nurses').countDocuments({
      hospital_id,
      status: { $in: ['Available', 'available', 'On Duty', 'on_duty'] },
    });
    await db.collection('hospitals').updateOne(
      { hospital_id },
      { $set: { 'overview.nurses_available': availCount } }
    );

    await logAudit(req.user!.email, req.user!.role, 'ADD_NURSE', hospital_id, { nurseId: result.insertedId, name });

    res.status(201).json({ message: 'Nurse added successfully.', nurse: { ...newNurse, _id: result.insertedId } });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to add nurse' });
  }
});

// Update nurse (Edit details or change status)
router.put('/:id', authMiddleware, requireHospitalAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const idFilter = buildIdFilter(id);

    const existing = await db.collection('nurses').findOne(idFilter);
    if (!existing) {
      return res.status(404).json({ error: 'Nurse not found' });
    }

    await db.collection('nurses').updateOne(idFilter, { $set: req.body });

    const hid = existing.hospital_id;
    // Sync count in hospitals collection
    const availCount = await db.collection('nurses').countDocuments({
      hospital_id: hid,
      status: { $in: ['Available', 'available', 'On Duty', 'on_duty'] },
    });
    await db.collection('hospitals').updateOne(
      { hospital_id: hid },
      { $set: { 'overview.nurses_available': availCount } }
    );

    await logAudit(req.user!.email, req.user!.role, 'UPDATE_NURSE', hid, { nurseId: id, update: req.body });
    res.json({ message: 'Nurse availability updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update nurse' });
  }
});

// Delete nurse
router.delete('/:id', authMiddleware, requireHospitalAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const idFilter = buildIdFilter(id);

    const existing = await db.collection('nurses').findOne(idFilter);
    if (!existing) {
      return res.status(404).json({ error: 'Nurse not found' });
    }

    const hid = existing.hospital_id;
    await db.collection('nurses').deleteOne(idFilter);

    // Sync count in hospitals collection
    const availCount = await db.collection('nurses').countDocuments({
      hospital_id: hid,
      status: { $in: ['Available', 'available', 'On Duty', 'on_duty'] },
    });
    await db.collection('hospitals').updateOne(
      { hospital_id: hid },
      { $set: { 'overview.nurses_available': availCount } }
    );

    await logAudit(req.user!.email, req.user!.role, 'DELETE_NURSE', hid, { nurseId: id });
    res.json({ message: 'Nurse removed successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete nurse' });
  }
});

export default router;
