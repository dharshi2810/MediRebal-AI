import { Router } from 'express';
import { getDb } from '../db/mongo';
import { AuthenticatedRequest, authMiddleware, requireHospitalAdmin, logAudit } from '../middleware/authMiddleware';
import { buildIdFilter } from '../utils/mongoHelper';

const router = Router();

// Get doctors for hospital
router.get('/:hospitalId', async (req, res) => {
  try {
    const { hospitalId } = req.params;
    const db = getDb();
    const doctors = await db.collection('doctors').find({ hospital_id: hospitalId }).toArray();
    res.json(doctors);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch doctors' });
  }
});

// Add doctor (Admin)
router.post('/', authMiddleware, requireHospitalAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { hospital_id, name, specialization, department, phone, shift_start, shift_end, status } = req.body;
    if (!hospital_id || !name || !specialization) {
      return res.status(400).json({ error: 'hospital_id, name, and specialization are required' });
    }

    if (req.user?.hospital_id && req.user.hospital_id !== hospital_id) {
      return res.status(403).json({ error: 'Cannot add doctor to another hospital' });
    }

    const db = getDb();
    const newDoc = {
      hospital_id,
      name: name.trim(),
      specialization: specialization.trim(),
      department: department || 'General Medicine',
      phone: phone || '',
      shift_start: shift_start || '09:00',
      shift_end: shift_end || '17:00',
      status: status || 'Available',
    };

    const result = await db.collection('doctors').insertOne(newDoc);

    // Update hospital available doctors count in MongoDB
    const availCount = await db.collection('doctors').countDocuments({
      hospital_id,
      status: { $in: ['Available', 'available'] },
    });
    await db.collection('hospitals').updateOne(
      { hospital_id },
      { $set: { 'overview.doctors_available': availCount } }
    );

    await logAudit(req.user!.email, req.user!.role, 'ADD_DOCTOR', hospital_id, { doctorId: result.insertedId, name });

    res.status(201).json({ message: 'Doctor added successfully.', doctor: { ...newDoc, _id: result.insertedId } });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to add doctor' });
  }
});

// Update doctor (Edit details or change status)
router.put('/:id', authMiddleware, requireHospitalAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const db = getDb();
    const idFilter = buildIdFilter(id);

    const existing = await db.collection('doctors').findOne(idFilter);
    if (!existing) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    await db.collection('doctors').updateOne(
      idFilter,
      { $set: updateData }
    );

    const hid = existing.hospital_id;
    // Update live count in hospitals collection
    const availCount = await db.collection('doctors').countDocuments({
      hospital_id: hid,
      status: { $in: ['Available', 'available'] },
    });
    await db.collection('hospitals').updateOne(
      { hospital_id: hid },
      { $set: { 'overview.doctors_available': availCount } }
    );

    await logAudit(req.user!.email, req.user!.role, 'UPDATE_DOCTOR', hid, { doctorId: id, updateData });

    res.json({ message: 'Doctor availability updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update doctor' });
  }
});

// Delete doctor
router.delete('/:id', authMiddleware, requireHospitalAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const idFilter = buildIdFilter(id);

    const existing = await db.collection('doctors').findOne(idFilter);
    if (!existing) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    const hid = existing.hospital_id;
    await db.collection('doctors').deleteOne(idFilter);

    // Update live count in hospitals collection
    const availCount = await db.collection('doctors').countDocuments({
      hospital_id: hid,
      status: { $in: ['Available', 'available'] },
    });
    await db.collection('hospitals').updateOne(
      { hospital_id: hid },
      { $set: { 'overview.doctors_available': availCount } }
    );

    await logAudit(req.user!.email, req.user!.role, 'DELETE_DOCTOR', hid, { doctorId: id });
    res.json({ message: 'Doctor removed successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete doctor' });
  }
});

export default router;
