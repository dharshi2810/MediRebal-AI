import { Router } from 'express';
import { getDb } from '../db/mongo';
import { AuthenticatedRequest, authMiddleware, logAudit } from '../middleware/authMiddleware';

const router = Router();

// Get emergency requests
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const db = getDb();
    let query: any = {};

    if (req.user) {
      if (req.user.role === 'HOSPITAL_ADMIN') {
        const hid = req.user.hospital_id;
        // Incoming requests where this hospital was targeted
        query.target_hospital_ids = hid;
      } else {
        // Public user: their own requests
        query.$or = [{ user_id: req.user.email }, { user_id: req.user.userId }];
      }
    }

    const requests = await db
      .collection('emergency_requests')
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    res.json(requests);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch emergency requests' });
  }
});

// Create multi-hospital emergency request
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      request_type,
      quantity = 1,
      priority = 'CRITICAL',
      target_hospital_ids = [],
      user_name,
      user_phone,
      user_location,
    } = req.body;

    if (!request_type || target_hospital_ids.length === 0) {
      return res.status(400).json({
        error: 'Please select an emergency resource type and at least one target hospital.',
      });
    }

    const db = getDb();
    const userId = req.user ? req.user.email : 'guest_user';
    const patientName = user_name || (req.user ? req.user.name : 'Emergency Patient');
    const patientPhone = user_phone || '+91 98400 00000';
    const patientLocation = user_location || 'Chennai';

    // Build hospital response tracking map
    const hospitalResponses: Record<string, any> = {};
    for (const hid of target_hospital_ids) {
      const hosp = await db.collection('hospitals').findOne({ hospital_id: hid });
      hospitalResponses[hid] = {
        hospital_name: hosp ? hosp.name : hid,
        phone: hosp ? hosp.emergency_phone || hosp.phone : '',
        status: 'pending',
        updated_at: new Date().toISOString(),
      };

      // Notify each target hospital immediately
      await db.collection('notifications').insertOne({
        user_id: hid,
        title: `🚨 EMERGENCY REQUEST: ${request_type.toUpperCase()}`,
        message: `${patientName} at ${patientLocation} urgently requests ${quantity} unit(s) of ${request_type}. Priority: ${priority}.`,
        type: 'emergency',
        read: false,
        createdAt: new Date().toISOString(),
      });
    }

    const newRequest = {
      user_id: userId,
      user_name: patientName,
      user_phone: patientPhone,
      user_location: patientLocation,
      request_type,
      quantity: parseInt(quantity) || 1,
      priority,
      target_hospital_ids,
      hospital_responses: hospitalResponses,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    const result = await db.collection('emergency_requests').insertOne(newRequest);

    await logAudit(userId, req.user?.role || 'PUBLIC_USER', 'SEND_EMERGENCY_REQUEST', undefined, {
      requestId: result.insertedId,
      targets: target_hospital_ids,
      request_type,
    });

    res.status(201).json({
      message: `Emergency request dispatched to ${target_hospital_ids.length} Chennai hospital(s)!`,
      request: { ...newRequest, _id: result.insertedId },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to dispatch emergency request' });
  }
});

// Update response from hospital (Accept / Reject / Mark Completed)
router.put('/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { status, hospital_id, responder_note } = req.body;

    const db = getDb();
    const emergencyReq = await db.collection('emergency_requests').findOne({ _id: id });
    if (!emergencyReq) {
      return res.status(404).json({ error: 'Emergency request not found' });
    }

    const hid = hospital_id || req.user?.hospital_id;
    if (!hid) {
      return res.status(400).json({ error: 'hospital_id is required to record hospital response' });
    }

    const currentResponses = emergencyReq.hospital_responses || {};
    currentResponses[hid] = {
      ...(currentResponses[hid] || {}),
      status,
      responder_note: responder_note || (status === 'accepted' ? 'Emergency team prepared and standing by.' : 'No capacity at this moment.'),
      updated_at: new Date().toISOString(),
    };

    const updateDoc: any = {
      hospital_responses: currentResponses,
      updatedAt: new Date().toISOString(),
    };

    if (status === 'accepted') {
      updateDoc.status = 'accepted';
      updateDoc.accepted_hospital_id = hid;

      const acceptingHospital = await db.collection('hospitals').findOne({ hospital_id: hid });
      const hospitalName = acceptingHospital ? acceptingHospital.name : hid;
      const emergencyContact = acceptingHospital ? acceptingHospital.emergency_phone || acceptingHospital.phone : '';

      // Immediately notify the user
      await db.collection('notifications').insertOne({
        user_id: emergencyReq.user_id,
        title: `✅ EMERGENCY ACCEPTED by ${hospitalName}`,
        message: `${hospitalName} accepted your ${emergencyReq.request_type} request! Emergency Phone: ${emergencyContact}. Direct contact established.`,
        type: 'emergency',
        read: false,
        createdAt: new Date().toISOString(),
      });

      // Adjust availability in database
      if (emergencyReq.request_type === 'oxygen') {
        await db.collection('resources').updateOne(
          { hospital_id: hid, resource_type: 'oxygen_cylinders' },
          { $inc: { current_stock: -Math.min(1, emergencyReq.quantity) } }
        );
      } else if (emergencyReq.request_type === 'emergency_bed' || emergencyReq.request_type === 'icu_bed') {
        const cat = emergencyReq.request_type === 'icu_bed' ? 'ICU Beds' : 'Emergency Beds';
        await db.collection('beds').updateOne(
          { hospital_id: hid, category: cat },
          { $inc: { occupied: 1, available: -1 } }
        );
      }
    } else if (status === 'completed') {
      updateDoc.status = 'completed';
    } else if (status === 'rejected') {
      // Check if all rejected
      const allRejected = Object.values(currentResponses).every((r: any) => r.status === 'rejected');
      if (allRejected) {
        updateDoc.status = 'rejected';
      }
    }

    await db.collection('emergency_requests').updateOne({ _id: id }, { $set: updateDoc });

    await logAudit(req.user?.email || hid, req.user?.role || 'HOSPITAL_ADMIN', 'EMERGENCY_RESPONSE', hid, {
      requestId: id,
      action: status,
    });

    res.json({
      message: `Emergency request status updated to ${status}`,
      request: { ...emergencyReq, ...updateDoc },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update emergency response' });
  }
});

export default router;
