import { Router } from 'express';
import { getDb } from '../db/mongo';
import { AuthenticatedRequest, authMiddleware, logAudit } from '../middleware/authMiddleware';
import { predictHospitalShortage } from '../services/mlPredictionService';

const router = Router();

// Get transfers
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const db = getDb();
    let query: any = {};

    if (req.user?.role === 'HOSPITAL_ADMIN' && req.user.hospital_id) {
      const hid = req.user.hospital_id;
      // Involved either as sender or recipient
      query.$or = [{ from_hospital_id: hid }, { to_hospital_id: hid }];
    }

    const transfers = await db
      .collection('transfer_requests')
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    res.json(transfers);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch transfers' });
  }
});

// Create transfer request
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      from_hospital_id,
      from_hospital_name,
      to_hospital_id,
      to_hospital_name,
      resource_type = 'oxygen_cylinders',
      quantity,
      priority = 'HIGH',
      deadline,
      reason,
      ai_justification,
      estimated_transit_time,
    } = req.body;

    if (!from_hospital_id || !to_hospital_id || !quantity) {
      return res.status(400).json({
        error: 'from_hospital_id, to_hospital_id, and quantity are required',
      });
    }

    const db = getDb();
    const qty = parseInt(quantity);

    const newTransfer = {
      from_hospital_id,
      from_hospital_name: from_hospital_name || from_hospital_id,
      to_hospital_id,
      to_hospital_name: to_hospital_name || to_hospital_id,
      resource_type,
      quantity: qty,
      priority,
      status: 'requested',
      deadline: deadline || 'Within 2 hours',
      reason: reason || 'Cross-hospital resource balancing request',
      ai_justification: ai_justification || '',
      estimated_transit_time: estimated_transit_time || '25-35 mins',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await db.collection('transfer_requests').insertOne(newTransfer);

    // Notify donor hospital
    await db.collection('notifications').insertOne({
      user_id: from_hospital_id,
      title: `🔄 RESOURCE TRANSFER REQUEST`,
      message: `${to_hospital_name} requested ${qty} ${resource_type}. Priority: ${priority}. Action required.`,
      type: 'transfer',
      read: false,
      createdAt: new Date().toISOString(),
    });

    await logAudit(
      req.user?.email || 'system',
      req.user?.role || 'HOSPITAL_ADMIN',
      'CREATE_TRANSFER_REQUEST',
      to_hospital_id,
      { transferId: result.insertedId, from: from_hospital_id, to: to_hospital_id, quantity: qty }
    );

    res.status(201).json({
      message: 'Transfer request dispatched to donor hospital',
      transfer: { ...newTransfer, _id: result.insertedId },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create transfer request' });
  }
});

// Update transfer status (accept, reject, in_transit, delivered, cancelled)
router.put('/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const allowed = ['requested', 'accepted', 'rejected', 'in_transit', 'delivered', 'cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: 'Invalid transfer status' });
    }

    const db = getDb();
    const transfer = await db.collection('transfer_requests').findOne({ _id: id });
    if (!transfer) {
      return res.status(404).json({ error: 'Transfer request not found' });
    }

    const now = new Date().toISOString();
    const updateDoc: any = {
      status,
      updatedAt: now,
    };
    if (notes) updateDoc.notes = notes;

    // Handle inventory state transitions
    if (status === 'accepted') {
      // Donor hospital agrees: deduct transfer quantity from donor inventory
      await db.collection('resources').updateOne(
        { hospital_id: transfer.from_hospital_id, resource_type: transfer.resource_type },
        { $inc: { current_stock: -transfer.quantity }, $set: { updated_at: now } }
      );
      // Notify recipient
      await db.collection('notifications').insertOne({
        user_id: transfer.to_hospital_id,
        title: `✅ TRANSFER APPROVED`,
        message: `${transfer.from_hospital_name} APPROVED transfer of ${transfer.quantity} units of ${transfer.resource_type}. Dispatch preparing.`,
        type: 'transfer',
        read: false,
        createdAt: now,
      });
    } else if (status === 'delivered') {
      // Recipient receives stock: add to recipient inventory!
      await db.collection('resources').updateOne(
        { hospital_id: transfer.to_hospital_id, resource_type: transfer.resource_type },
        { $inc: { current_stock: transfer.quantity }, $set: { updated_at: now } }
      );

      // Re-run predictions for both hospitals
      await predictHospitalShortage(transfer.from_hospital_id);
      await predictHospitalShortage(transfer.to_hospital_id);

      // Notify both hospitals of successful completion
      await db.collection('notifications').insertOne({
        user_id: transfer.to_hospital_id,
        title: `📦 TRANSFER DELIVERED & RESTOCKED`,
        message: `${transfer.quantity} units of ${transfer.resource_type} successfully received from ${transfer.from_hospital_name}. Safe buffer restored!`,
        type: 'transfer',
        read: false,
        createdAt: now,
      });

      await db.collection('notifications').insertOne({
        user_id: transfer.from_hospital_id,
        title: `📦 TRANSFER COMPLETED`,
        message: `Delivery of ${transfer.quantity} units to ${transfer.to_hospital_name} confirmed. Rebalancing complete.`,
        type: 'transfer',
        read: false,
        createdAt: now,
      });
    }

    await db.collection('transfer_requests').updateOne({ _id: id }, { $set: updateDoc });

    await logAudit(
      req.user?.email || 'admin',
      req.user?.role || 'HOSPITAL_ADMIN',
      `TRANSFER_${status.toUpperCase()}`,
      transfer.to_hospital_id,
      { transferId: id, status }
    );

    res.json({
      message: `Transfer status updated to ${status}`,
      transfer: { ...transfer, ...updateDoc },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update transfer status' });
  }
});

export default router;
