import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { getDb } from '../db/mongo';
import { AuthenticatedRequest, authMiddleware, logAudit } from '../middleware/authMiddleware';
import { predictHospitalShortage } from '../services/mlPredictionService';

const router = Router();

// Helper to normalize status strings to user-specified titles
function normalizeTransferStatus(input: string): string {
  const s = (input || '').toLowerCase().trim();
  if (s === 'accepted') return 'Accepted';
  if (s === 'rejected') return 'Rejected';
  if (s === 'in_transit' || s === 'in transit') return 'In Transit';
  if (s === 'delivered') return 'Delivered';
  if (s === 'cancelled' || s === 'canceled') return 'Cancelled';
  return 'Pending';
}

// Format readable date like "10 October 2026"
function formatReadableDate(date: Date = new Date()): string {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// Get transfers with optional filtering by hospitalId and type (sent / received)
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const db = getDb();
    const targetHid =
      (req.query.hospitalId as string) ||
      (req.user?.role === 'HOSPITAL_ADMIN' ? req.user.hospital_id : undefined);
    const filterType = (req.query.type as string)?.toLowerCase();

    let query: any = {};

    if (targetHid) {
      if (filterType === 'sent' || filterType === 'my_requests') {
        // "My Requests": requests THIS hospital has sent to other hospitals
        query.$or = [
          { requester_hospital_id: targetHid },
          { to_hospital_id: targetHid },
        ];
      } else if (filterType === 'received' || filterType === 'incoming' || filterType === 'resource_requests') {
        // "Resource Requests": incoming requests received from other hospitals
        query.$or = [
          { requested_from_hospital_id: targetHid },
          { from_hospital_id: targetHid },
          { target_hospital_id: targetHid },
        ];
      } else {
        // All transfers involving this hospital
        query.$or = [
          { requester_hospital_id: targetHid },
          { to_hospital_id: targetHid },
          { requested_from_hospital_id: targetHid },
          { from_hospital_id: targetHid },
          { target_hospital_id: targetHid },
        ];
      }
    }

    const transfers = await db
      .collection('transfer_requests')
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    // Map fields for complete client convenience
    const mapped = transfers.map((t: any) => ({
      ...t,
      _id: t._id.toString(),
      status: normalizeTransferStatus(t.status),
      resource_type: t.resource_type || 'Oxygen Cylinders',
      requested_from_hospital_name:
        t.requested_from_hospital_name || t.from_hospital_name || t.target_hospital_name || 'Partner Hospital',
      requested_from_hospital_id:
        t.requested_from_hospital_id || t.from_hospital_id || t.target_hospital_id || 'H002',
      requester_hospital_name:
        t.requester_hospital_name || t.to_hospital_name || 'Requesting Hospital',
      requester_hospital_id:
        t.requester_hospital_id || t.to_hospital_id || 'H001',
      requested_on: t.requested_on || formatReadableDate(new Date(t.createdAt || Date.now())),
    }));

    res.json(mapped);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch transfers' });
  }
});

// Create transfer / resource request
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      // Support explicit request fields
      requester_hospital_id,
      requester_hospital_name,
      requested_from_hospital_id,
      requested_from_hospital_name,
      target_hospital_id,
      target_hospital_name,
      // Legacy aliases
      from_hospital_id,
      from_hospital_name,
      to_hospital_id,
      to_hospital_name,
      resource_type = 'Oxygen Cylinders',
      quantity,
      priority = 'High',
      deadline,
      reason,
      ai_justification,
      estimated_transit_time,
    } = req.body;

    const reqHid = requester_hospital_id || to_hospital_id || req.user?.hospital_id;
    const reqName = requester_hospital_name || to_hospital_name || 'Hospital ' + reqHid;
    const targetHid = requested_from_hospital_id || target_hospital_id || from_hospital_id;
    const targetName = requested_from_hospital_name || target_hospital_name || from_hospital_name || 'Hospital ' + targetHid;

    if (!reqHid || !targetHid || !quantity) {
      return res.status(400).json({
        error: 'requester hospital, target hospital, and quantity are required',
      });
    }

    const db = getDb();
    const qty = parseInt(quantity, 10);
    const now = new Date();
    const readableDate = formatReadableDate(now);

    const newTransfer: any = {
      // Direct requester (Hospital A - Needs resource)
      requester_hospital_id: reqHid,
      requester_hospital_name: reqName,
      // Target donor (Hospital B - Has resource)
      requested_from_hospital_id: targetHid,
      requested_from_hospital_name: targetName,
      target_hospital_id: targetHid,
      target_hospital_name: targetName,

      // Dual compatibility for ML and legacy endpoints
      from_hospital_id: targetHid,
      from_hospital_name: targetName,
      to_hospital_id: reqHid,
      to_hospital_name: reqName,

      resource_type,
      quantity: qty,
      priority: priority || 'High',
      status: 'Pending',
      requested_on: readableDate,
      deadline: deadline || 'Within 2 hours',
      reason: reason || 'Inter-hospital resource balancing request',
      ai_justification: ai_justification || '',
      estimated_transit_time: estimated_transit_time || '25-35 mins',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    const result = await db.collection('transfer_requests').insertOne(newTransfer);

    // Notify receiving hospital B under "Resource Requests"
    await db.collection('notifications').insertOne({
      user_id: targetHid,
      title: `🔄 RESOURCE REQUEST RECEIVED`,
      message: `${reqName} has requested ${qty} ${resource_type} (Priority: ${priority}). Action required: Review in Resource Requests.`,
      type: 'transfer',
      read: false,
      createdAt: now.toISOString(),
    });

    await logAudit(
      req.user?.email || 'admin',
      req.user?.role || 'HOSPITAL_ADMIN',
      'CREATE_RESOURCE_REQUEST',
      reqHid,
      { transferId: result.insertedId, requester: reqHid, target: targetHid, quantity: qty, resource_type }
    );

    res.status(201).json({
      message: `Resource request for ${qty} ${resource_type} sent to ${targetName}`,
      transfer: { ...newTransfer, _id: result.insertedId.toString() },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create resource request' });
  }
});

// Update transfer status (Accept, Reject, In Transit, Delivered, Cancelled)
router.put('/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const normalizedStatus = normalizeTransferStatus(status);
    const db = getDb();

    // Find transfer by ObjectId or string id
    let filter: any;
    if (ObjectId.isValid(id)) {
      filter = { $or: [{ _id: new ObjectId(id) }, { _id: id }] };
    } else {
      filter = { _id: id };
    }

    const transfer = await db.collection('transfer_requests').findOne(filter);
    if (!transfer) {
      return res.status(404).json({ error: 'Transfer request not found' });
    }

    const now = new Date().toISOString();
    const updateDoc: any = {
      status: normalizedStatus,
      updatedAt: now,
    };
    if (notes) updateDoc.notes = notes;

    const donorHid = transfer.requested_from_hospital_id || transfer.from_hospital_id;
    const donorName = transfer.requested_from_hospital_name || transfer.from_hospital_name;
    const recipientHid = transfer.requester_hospital_id || transfer.to_hospital_id;
    const recipientName = transfer.requester_hospital_name || transfer.to_hospital_name;
    const resourceType = transfer.resource_type || 'Oxygen Cylinders';
    const qty = transfer.quantity || 0;

    // Handle inventory & notifications per state transition
    if (normalizedStatus === 'Accepted') {
      // Donor hospital agrees to dispatch: optionally deduct stock
      const stockKey = resourceType.toLowerCase().includes('oxygen')
        ? 'oxygen_cylinders'
        : resourceType.toLowerCase().includes('ventilator')
        ? 'ventilators'
        : null;

      if (stockKey) {
        await db.collection('resources').updateOne(
          { hospital_id: donorHid, resource_type: stockKey },
          { $inc: { current_stock: -qty }, $set: { updated_at: now } }
        );
      }

      // Notify Hospital A (requester) that Hospital B accepted
      await db.collection('notifications').insertOne({
        user_id: recipientHid,
        title: `✅ RESOURCE REQUEST ACCEPTED`,
        message: `${donorName} ACCEPTED your request for ${qty} ${resourceType}. Preparing dispatch!`,
        type: 'transfer',
        read: false,
        createdAt: now,
      });
    } else if (normalizedStatus === 'Rejected') {
      // Notify Hospital A that Hospital B rejected
      await db.collection('notifications').insertOne({
        user_id: recipientHid,
        title: `❌ RESOURCE REQUEST DECLINED`,
        message: `${donorName} was unable to fulfill your request for ${qty} ${resourceType} at this time.`,
        type: 'transfer',
        read: false,
        createdAt: now,
      });
    } else if (normalizedStatus === 'In Transit') {
      // Notify both that resource is on the road
      await db.collection('notifications').insertOne({
        user_id: recipientHid,
        title: `🚚 RESOURCE IN TRANSIT`,
        message: `${qty} ${resourceType} dispatched from ${donorName}. In transit to your hospital!`,
        type: 'transfer',
        read: false,
        createdAt: now,
      });
    } else if (normalizedStatus === 'Delivered') {
      // Recipient hospital receives stock: add to recipient inventory
      const stockKey = resourceType.toLowerCase().includes('oxygen')
        ? 'oxygen_cylinders'
        : resourceType.toLowerCase().includes('ventilator')
        ? 'ventilators'
        : null;

      if (stockKey) {
        await db.collection('resources').updateOne(
          { hospital_id: recipientHid, resource_type: stockKey },
          { $inc: { current_stock: qty }, $set: { updated_at: now } }
        );
      }

      // Recalculate predictions
      if (donorHid) await predictHospitalShortage(donorHid);
      if (recipientHid) await predictHospitalShortage(recipientHid);

      // Notify both hospitals
      await db.collection('notifications').insertOne({
        user_id: recipientHid,
        title: `📦 RESOURCE DELIVERED & RESTOCKED`,
        message: `${qty} ${resourceType} received safely from ${donorName}. Stock successfully updated.`,
        type: 'transfer',
        read: false,
        createdAt: now,
      });

      await db.collection('notifications').insertOne({
        user_id: donorHid,
        title: `📦 RESOURCE DELIVERY COMPLETED`,
        message: `Delivery of ${qty} ${resourceType} to ${recipientName} confirmed. Rebalancing complete.`,
        type: 'transfer',
        read: false,
        createdAt: now,
      });
    }

    await db.collection('transfer_requests').updateOne(filter, { $set: updateDoc });

    await logAudit(
      req.user?.email || 'admin',
      req.user?.role || 'HOSPITAL_ADMIN',
      `TRANSFER_${normalizedStatus.toUpperCase()}`,
      donorHid,
      { transferId: id, status: normalizedStatus }
    );

    res.json({
      message: `Resource request status updated to ${normalizedStatus}`,
      transfer: { ...transfer, ...updateDoc, _id: id, status: normalizedStatus },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update resource request status' });
  }
});

export default router;

