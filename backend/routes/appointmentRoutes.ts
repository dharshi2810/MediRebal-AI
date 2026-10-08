import { Router } from 'express';
import { getDb } from '../db/mongo';
import { AuthenticatedRequest, authMiddleware, logAudit } from '../middleware/authMiddleware';
import { buildIdFilter } from '../utils/mongoHelper';

const router = Router();

// Normalize appointment status to title-case standard
function normalizeStatus(status: string): string {
  const s = (status || '').toLowerCase().trim();
  if (s === 'approve' || s === 'approved' || s === 'confirm' || s === 'confirmed') return 'Approved';
  if (s === 'reject' || s === 'rejected') return 'Rejected';
  if (s === 'complete' || s === 'completed') return 'Completed';
  if (s === 'cancel' || s === 'cancelled') return 'Cancelled';
  if (s === 'pending') return 'Pending';
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

// Get appointments with strict hospital-level isolation
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const db = getDb();
    const conditions: any[] = [];
    const { doctorId, hospitalId, status, date } = req.query;

    // Doctor filter (if requested or if doctor user)
    if (doctorId) {
      conditions.push({ $or: [{ doctorId: doctorId }, { doctor_id: doctorId }] });
    }

    // Role-based authorization & isolation
    if (req.user) {
      if (req.user.role === 'HOSPITAL_ADMIN') {
        // HOSPITAL ADMIN MUST NOT SEE OTHER HOSPITAL APPOINTMENTS
        // Strictly filter using hospitalId from authenticated user profile
        const hid = req.user.hospital_id;
        if (hid) {
          conditions.push({ $or: [{ hospitalId: hid }, { hospital_id: hid }] });
        } else if (hospitalId) {
          conditions.push({ $or: [{ hospitalId: hospitalId }, { hospital_id: hospitalId }] });
        }
      } else if (req.user.role === 'DOCTOR') {
        // Doctor sees appointments assigned to them
        const docId = req.user.doctorId || req.user.doctor_id || doctorId || req.user.email;
        conditions.push({
          $or: [
            { doctorId: docId },
            { doctor_id: docId },
            { doctorName: req.user.name },
            { doctor_name: req.user.name },
          ],
        });
      } else {
        // Patient / Public user: find by email or userId
        conditions.push({
          $or: [
            { patientId: req.user.email },
            { patient_id: req.user.email },
            { patientId: req.user.userId },
            { patient_id: req.user.userId },
          ],
        });
      }
    } else if (hospitalId) {
      conditions.push({ $or: [{ hospitalId: hospitalId }, { hospital_id: hospitalId }] });
    }

    // Optional status filter
    if (status && typeof status === 'string' && status !== 'all') {
      const norm = normalizeStatus(status);
      conditions.push({
        $or: [
          { status: norm },
          { status: norm.toLowerCase() },
          ...(norm === 'Approved' ? [{ status: 'confirmed' }, { status: 'Confirmed' }] : []),
        ],
      });
    }

    // Optional date filter
    if (date && typeof date === 'string') {
      conditions.push({ $or: [{ appointmentDate: date }, { date: date }] });
    }

    const query = conditions.length > 0 ? (conditions.length === 1 ? conditions[0] : { $and: conditions }) : {};

    const appointments = await db
      .collection('appointments')
      .find(query)
      .sort({ appointmentDate: -1, appointmentTime: 1, date: -1, time: 1, createdAt: -1 })
      .toArray();

    // Standardize documents for both camelCase and legacy consumers
    const formatted = appointments.map((appt: any) => ({
      ...appt,
      status: normalizeStatus(appt.status || 'Pending'),
      patientId: appt.patientId || appt.patient_id,
      patientName: appt.patientName || appt.patient_name || 'Patient',
      patientPhone: appt.patientPhone || appt.patient_phone || '',
      hospitalId: appt.hospitalId || appt.hospital_id,
      hospitalName: appt.hospitalName || appt.hospital_name,
      departmentId: appt.departmentId || appt.department_id || appt.department,
      departmentName: appt.departmentName || appt.department || 'General Medicine',
      doctorId: appt.doctorId || appt.doctor_id,
      doctorName: appt.doctorName || appt.doctor_name,
      appointmentDate: appt.appointmentDate || appt.date,
      appointmentTime: appt.appointmentTime || appt.time,
      // Keep legacy aliases
      patient_id: appt.patientId || appt.patient_id,
      patient_name: appt.patientName || appt.patient_name || 'Patient',
      patient_phone: appt.patientPhone || appt.patient_phone || '',
      hospital_id: appt.hospitalId || appt.hospital_id,
      hospital_name: appt.hospitalName || appt.hospital_name,
      doctor_id: appt.doctorId || appt.doctor_id,
      doctor_name: appt.doctorName || appt.doctor_name,
      department: appt.departmentName || appt.department || 'General Medicine',
      date: appt.appointmentDate || appt.date,
      time: appt.appointmentTime || appt.time,
    }));

    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch appointments' });
  }
});

// Book appointment
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const body = req.body;
    const hospital_id = body.hospitalId || body.hospital_id;
    const doctor_id = body.doctorId || body.doctor_id;
    const doctor_name = body.doctorName || body.doctor_name;
    const department_id = body.departmentId || body.department_id || body.department || 'General Medicine';
    const department_name = body.departmentName || body.department || 'General Medicine';
    const date = body.appointmentDate || body.date;
    const time = body.appointmentTime || body.time;
    const symptoms = body.symptoms || 'General Consultation';
    const patient_name = body.patientName || body.patient_name || (req.user ? req.user.name : 'Patient');
    const patient_phone = body.patientPhone || body.patient_phone || '';
    const patient_id = body.patientId || (req.user ? req.user.email : 'guest_patient');

    if (!hospital_id || !doctor_id || !date || !time) {
      return res.status(400).json({ error: 'Hospital, doctor, date, and time slot are required' });
    }

    const db = getDb();

    // Check for double booking conflict
    const existing = await db.collection('appointments').findOne({
      $or: [{ hospital_id, doctor_id }, { hospitalId: hospital_id, doctorId: doctor_id }],
      $and: [
        { $or: [{ date }, { appointmentDate: date }] },
        { $or: [{ time }, { appointmentTime: time }] },
        { $or: [{ status: { $in: ['Pending', 'pending', 'Approved', 'approved', 'Confirmed', 'confirmed'] } }] },
      ],
    });

    if (existing) {
      return res.status(409).json({
        error: `Slot ${time} on ${date} for ${doctor_name || 'this doctor'} is already booked. Please pick another time slot.`,
      });
    }

    // Lookup hospital name
    const hospital = await db.collection('hospitals').findOne({
      $or: [{ hospital_id }, { _id: hospital_id }],
    });
    const hospitalName = body.hospitalName || (hospital ? hospital.name : hospital_id);

    const now = new Date().toISOString();

    // The document must contain exact required fields:
    // patientId, patientName, patientPhone, hospitalId, hospitalName, departmentId, departmentName, doctorId, doctorName, appointmentDate, appointmentTime, status: "Pending", createdAt, updatedAt
    const newAppt: any = {
      // Requested camelCase fields
      patientId: patient_id,
      patientName: patient_name,
      patientPhone: patient_phone,
      hospitalId: hospital_id,
      hospitalName: hospitalName,
      departmentId: department_id,
      departmentName: department_name,
      doctorId: doctor_id,
      doctorName: doctor_name || doctor_id,
      appointmentDate: date,
      appointmentTime: time,
      status: 'Pending',
      createdAt: now,
      updatedAt: now,

      // Compatibility fields for existing frontend UI
      patient_id: patient_id,
      patient_name: patient_name,
      patient_phone: patient_phone,
      hospital_id: hospital_id,
      hospital_name: hospitalName,
      doctor_id: doctor_id,
      doctor_name: doctor_name || doctor_id,
      department: department_name,
      date: date,
      time: time,
      symptoms: symptoms,
    };

    const result = await db.collection('appointments').insertOne(newAppt);

    if (!result.insertedId) {
      throw new Error('Database insert failed: document was not saved');
    }

    // Notify hospital admin
    try {
      await db.collection('notifications').insertOne({
        user_id: hospital_id,
        title: '📅 New Patient Appointment Request',
        message: `${patient_name} requested an appointment with ${doctor_name} (${department_name}) on ${date} at ${time}.`,
        type: 'appointment',
        read: false,
        createdAt: now,
      });
    } catch (_) {}

    try {
      await logAudit(patient_id, req.user?.role || 'PUBLIC_USER', 'BOOK_APPOINTMENT', hospital_id, {
        appointmentId: result.insertedId,
        date,
        time,
      });
    } catch (_) {}

    res.status(201).json({
      message: 'Appointment booked successfully!',
      appointment: { ...newAppt, _id: result.insertedId },
    });
  } catch (err: any) {
    console.error('Failed to book appointment:', err);
    res.status(500).json({ error: err.message || 'Failed to book appointment' });
  }
});

// Update appointment status: APPROVE, REJECT, COMPLETE, CANCEL
router.put('/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = [
      'pending',
      'approve',
      'approved',
      'confirm',
      'confirmed',
      'reject',
      'rejected',
      'complete',
      'completed',
      'cancel',
      'cancelled',
      'no_show',
    ];

    if (!status || !allowed.includes(status.toLowerCase())) {
      return res.status(400).json({ error: 'Invalid appointment status. Allowed: Approve, Reject, Complete, Cancel' });
    }

    const db = getDb();
    const idFilter = buildIdFilter(id);
    const appt = await db.collection('appointments').findOne(idFilter);
    if (!appt) {
      return res.status(404).json({ error: 'Appointment not found in medirebal.appointments' });
    }

    // Check Hospital Admin authorization: Hospital Admin can only manage appointments of their own hospital
    if (req.user && req.user.role === 'HOSPITAL_ADMIN') {
      const adminHospitalId = req.user.hospital_id;
      const apptHospitalId = appt.hospitalId || appt.hospital_id;
      if (adminHospitalId && apptHospitalId && adminHospitalId !== apptHospitalId) {
        return res.status(403).json({ error: 'Unauthorized: Hospital Admin cannot modify appointments for other hospitals' });
      }
    }

    // Role verification: public user can only cancel their own appointment
    if (req.user && req.user.role === 'PUBLIC_USER') {
      const isOwner =
        appt.patientId === req.user.email ||
        appt.patient_id === req.user.email ||
        appt.patientId === req.user.userId ||
        appt.patient_id === req.user.userId;

      if (!isOwner) {
        return res.status(403).json({ error: 'Unauthorized to modify this appointment' });
      }
      const norm = normalizeStatus(status);
      if (norm !== 'Cancelled') {
        return res.status(403).json({ error: 'Patients can only cancel their own appointments' });
      }
    }

    const now = new Date().toISOString();
    const normalizedStatus = normalizeStatus(status);

    const updateRes = await db.collection('appointments').updateOne(
      idFilter,
      {
        $set: {
          status: normalizedStatus,
          updatedAt: now,
        },
      }
    );

    if (updateRes.matchedCount === 0) {
      throw new Error('Database update failed: document was not updated');
    }

    // Patient notification messages per status
    const statusTitles: Record<string, string> = {
      Approved: 'Appointment Approved',
      Rejected: 'Appointment Rejected',
      Completed: 'Appointment Completed',
      Cancelled: 'Appointment Cancelled',
      Pending: 'Appointment Status Updated',
    };

    const statusTitle = statusTitles[normalizedStatus] || `Appointment ${normalizedStatus}`;
    const patientUser = appt.patientId || appt.patient_id;
    const docName = appt.doctorName || appt.doctor_name || 'Doctor';
    const hospName = appt.hospitalName || appt.hospital_name || 'Hospital';
    const apptDate = appt.appointmentDate || appt.date;
    const apptTime = appt.appointmentTime || appt.time;

    // Send real-time notification to patient document
    if (patientUser) {
      try {
        await db.collection('notifications').insertOne({
          user_id: patientUser,
          title: statusTitle,
          message:
            normalizedStatus === 'Approved'
              ? `Your appointment with ${docName} at ${hospName} on ${apptDate} at ${apptTime} has been APPROVED.`
              : normalizedStatus === 'Rejected'
              ? `Your appointment request with ${docName} at ${hospName} has been REJECTED by the hospital admin.`
              : normalizedStatus === 'Completed'
              ? `Your appointment with ${docName} on ${apptDate} has been marked COMPLETED.`
              : `Your appointment with ${docName} on ${apptDate} at ${apptTime} is now CANCELLED.`,
          type: 'appointment',
          status: normalizedStatus,
          appointmentId: id,
          read: false,
          createdAt: now,
        });
      } catch (_) {}
    }

    try {
      await logAudit(
        req.user?.email || 'user',
        req.user?.role || 'USER',
        `APPOINTMENT_${normalizedStatus.toUpperCase()}`,
        appt.hospitalId || appt.hospital_id,
        {
          appointmentId: id,
          newStatus: normalizedStatus,
          patientId: patientUser,
          doctorName: docName,
        }
      );
    } catch (_) {}

    res.json({
      message: `Appointment ${normalizedStatus} successfully!`,
      status: normalizedStatus,
      statusLabel: statusTitle,
      appointmentId: id,
      updatedAt: now,
    });
  } catch (err: any) {
    console.error('Failed to update appointment:', err);
    res.status(500).json({ error: err.message || 'Failed to update appointment' });
  }
});

export default router;
