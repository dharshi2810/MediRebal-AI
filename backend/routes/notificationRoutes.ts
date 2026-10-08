import { Router } from 'express';
import { getDb } from '../db/mongo';
import { AuthenticatedRequest, authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Get notifications for current user/hospital
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const db = getDb();
    const queryIds: string[] = ['all'];

    if (req.user) {
      if (req.user.email) queryIds.push(req.user.email);
      if (req.user.userId) queryIds.push(req.user.userId);
      if (req.user.hospital_id) queryIds.push(req.user.hospital_id);
    }

    const notifications = await db
      .collection('notifications')
      .find({ user_id: { $in: queryIds } })
      .sort({ createdAt: -1 })
      .limit(30)
      .toArray();

    const unreadCount = notifications.filter((n: any) => !n.read).length;

    res.json({ notifications, unreadCount });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch notifications' });
  }
});

// Mark single notification as read
router.put('/:id/read', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    await db.collection('notifications').updateOne({ _id: id }, { $set: { read: true } });
    res.json({ message: 'Notification marked as read' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update notification' });
  }
});

// Mark all as read
router.put('/read-all', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const db = getDb();
    const queryIds: string[] = ['all'];
    if (req.user) {
      if (req.user.email) queryIds.push(req.user.email);
      if (req.user.hospital_id) queryIds.push(req.user.hospital_id);
    }

    await db
      .collection('notifications')
      .updateMany({ user_id: { $in: queryIds } }, { $set: { read: true } });

    res.json({ message: 'All notifications marked as read' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to mark notifications' });
  }
});

export default router;
