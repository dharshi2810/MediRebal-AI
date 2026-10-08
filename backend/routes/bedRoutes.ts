import { Router } from 'express';
import { getDb } from '../db/mongo';
import { AuthenticatedRequest, authMiddleware, requireHospitalAdmin, requireSpecificHospital, logAudit } from '../middleware/authMiddleware';

const router = Router();

// Get beds for a hospital
router.get('/:hospitalId', async (req, res) => {
  try {
    const { hospitalId } = req.params;
    const db = getDb();
    const beds = await db.collection('beds').find({ hospital_id: hospitalId }).toArray();
    res.json(beds);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch bed data' });
  }
});

// Update beds (single category, list of categories, or direct overview)
router.put('/:hospitalId', authMiddleware, requireHospitalAdmin, requireSpecificHospital('hospitalId'), async (req: AuthenticatedRequest, res) => {
  try {
    const { hospitalId } = req.params;
    const db = getDb();

    // Check if bulk categories list is provided
    if (Array.isArray(req.body.beds)) {
      for (const b of req.body.beds) {
        const total = parseInt(b.total) || 0;
        let available = b.available !== undefined ? parseInt(b.available) : undefined;
        let occupied = b.occupied !== undefined ? parseInt(b.occupied) : undefined;
        if (available !== undefined && occupied === undefined) {
          occupied = Math.max(0, total - available);
        } else if (occupied !== undefined && available === undefined) {
          available = Math.max(0, total - occupied);
        } else if (available === undefined && occupied === undefined) {
          available = total;
          occupied = 0;
        }
        await db.collection('beds').updateOne(
          { hospital_id: hospitalId, category: b.category },
          { $set: { total, occupied, available: Math.max(0, available!) } },
          { upsert: true }
        );
      }
    } else if (req.body.category) {
      const { category } = req.body;
      const totalNum = parseInt(req.body.total) || 0;
      let availableNum = req.body.available !== undefined ? parseInt(req.body.available) : undefined;
      let occupiedNum = req.body.occupied !== undefined ? parseInt(req.body.occupied) : undefined;

      if (availableNum !== undefined && occupiedNum === undefined) {
        occupiedNum = Math.max(0, totalNum - availableNum);
      } else if (occupiedNum !== undefined && availableNum === undefined) {
        availableNum = Math.max(0, totalNum - occupiedNum);
      } else if (availableNum !== undefined && occupiedNum !== undefined) {
        // use provided availableNum
      } else {
        availableNum = totalNum;
        occupiedNum = 0;
      }

      await db.collection('beds').updateOne(
        { hospital_id: hospitalId, category },
        {
          $set: {
            total: totalNum,
            occupied: occupiedNum,
            available: availableNum,
          },
        },
        { upsert: true }
      );
    }

    // Recompute and update hospital overview
    const allBeds = await db.collection('beds').find({ hospital_id: hospitalId }).toArray();
    const totalCapacity = allBeds.reduce((acc: number, b: any) => acc + (b.total || 0), 0);
    const totalAvail = allBeds.reduce((acc: number, b: any) => acc + (b.available || 0), 0);
    const icuBed = allBeds.find((b: any) => b.category === 'ICU Beds');
    const emergencyBed = allBeds.find((b: any) => b.category === 'Emergency Beds');
    const isolationBed = allBeds.find((b: any) => b.category === 'Isolation Beds');

    await db.collection('hospitals').updateOne(
      { hospital_id: hospitalId },
      {
        $set: {
          'overview.total_beds': totalCapacity,
          'overview.available_beds': totalAvail,
          'overview.icu_beds': icuBed ? (icuBed.available ?? 0) : 0,
          'overview.emergency_beds': emergencyBed ? (emergencyBed.available ?? 0) : 0,
          'overview.isolation_beds': isolationBed ? (isolationBed.available ?? 0) : 0,
        },
      }
    );

    await logAudit(req.user!.email, req.user!.role, 'UPDATE_BEDS', hospitalId, { update: req.body });

    res.json({
      message: 'Bed availability updated successfully',
      beds: allBeds,
      overview: {
        total_beds: totalCapacity,
        available_beds: totalAvail,
        icu_beds: icuBed ? icuBed.available : 0,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update beds' });
  }
});

export default router;
