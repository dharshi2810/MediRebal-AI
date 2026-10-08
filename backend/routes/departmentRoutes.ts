import { Router } from 'express';
import { getDb } from '../db/mongo';
import { AuthenticatedRequest, authMiddleware, requireHospitalAdmin, logAudit } from '../middleware/authMiddleware';
import { buildIdFilter } from '../utils/mongoHelper';

const router = Router();

router.get('/:hospitalId', async (req, res) => {
  try {
    const { hospitalId } = req.params;
    const db = getDb();
    const depts = await db.collection('departments').find({ hospital_id: hospitalId }).toArray();
    res.json(depts);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch departments' });
  }
});

router.post('/', authMiddleware, requireHospitalAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { hospital_id, name, status, head_doctor, bed_count } = req.body;
    if (!hospital_id || !name) {
      return res.status(400).json({ error: 'hospital_id and name are required' });
    }
    const db = getDb();
    const newDept = {
      hospital_id,
      name,
      status: status || 'Open',
      head_doctor: head_doctor || 'Staff Physician',
      bed_count: parseInt(bed_count) || 20,
    };
    const result = await db.collection('departments').insertOne(newDept);
    await logAudit(req.user!.email, req.user!.role, 'ADD_DEPARTMENT', hospital_id, { name });
    res.status(201).json({ message: 'Department added', department: { ...newDept, _id: result.insertedId } });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to add department' });
  }
});

router.put('/:id', authMiddleware, requireHospitalAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const idFilter = buildIdFilter(id);
    await db.collection('departments').updateOne(idFilter, { $set: req.body });
    await logAudit(req.user!.email, req.user!.role, 'UPDATE_DEPARTMENT', req.user!.hospital_id, { deptId: id, update: req.body });
    res.json({ message: 'Department updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update department' });
  }
});

export default router;
