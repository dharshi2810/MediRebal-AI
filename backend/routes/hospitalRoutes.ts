import { Router } from 'express';
import { getDb } from '../db/mongo';
import { AuthenticatedRequest, authMiddleware, requireHospitalAdmin, requireSpecificHospital, logAudit } from '../middleware/authMiddleware';

const router = Router();

// Calculate distance in km using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// Get all hospitals with optional search and distance calculation
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const { area, search, userLat, userLng, resource, minBeds } = req.query;

    let query: any = {};
    if (area && area !== 'All') {
      query.area = area;
    }

    let hospitals = await db.collection('hospitals').find(query).toArray();

    // Compute live real-time stats for each hospital from MongoDB collections
    const enriched = await Promise.all(
      hospitals.map(async (h: any) => {
        const hid = h.hospital_id;

        // Fetch live oxygen
        const oxy = await db.collection('resources').findOne({ hospital_id: hid, resource_type: 'oxygen_cylinders' });
        // Fetch live beds
        const beds = await db.collection('beds').find({ hospital_id: hid }).toArray();
        const icuBed = beds.find((b: any) => b.category === 'ICU Beds');
        const emergencyBed = beds.find((b: any) => b.category === 'Emergency Beds');
        const isolationBed = beds.find((b: any) => b.category === 'Isolation Beds');
        const totalAvailBeds = beds.length > 0 ? beds.reduce((acc: number, b: any) => acc + (b.available ?? 0), 0) : (h.overview?.available_beds || 0);
        const totalAllBeds = beds.length > 0 ? beds.reduce((acc: number, b: any) => acc + (b.total ?? 0), 0) : (h.overview?.total_beds || 0);

        // Fetch doctors available (case insensitive)
        const availDocs = await db.collection('doctors').countDocuments({
          hospital_id: hid,
          status: { $in: ['Available', 'available'] },
        });
        // Fetch nurses available (case insensitive)
        const availNurses = await db.collection('nurses').countDocuments({
          hospital_id: hid,
          status: { $in: ['Available', 'available', 'On Duty', 'on_duty', 'On duty'] },
        });
        // Fetch ambulances available (case insensitive)
        const availAmbs = await db.collection('ambulances').countDocuments({
          hospital_id: hid,
          status: { $in: ['Available', 'available'] },
        });

        const oxyStock = oxy ? oxy.current_stock : (h.overview?.oxygen_cylinders || 0);
        const oxyStatus = oxy?.status || h.overview?.oxygen_status || (oxyStock <= 30 ? 'Critical' : oxyStock <= 60 ? 'Low' : oxyStock <= 100 ? 'Limited' : 'Good');

        let distanceKm: number | null = null;
        if (userLat && userLng) {
          distanceKm = calculateDistance(
            parseFloat(userLat as string),
            parseFloat(userLng as string),
            h.latitude,
            h.longitude
          );
        }

        return {
          ...h,
          distanceKm,
          overview: {
            ...h.overview,
            total_beds: totalAllBeds,
            oxygen_cylinders: oxyStock,
            oxygen_status: oxyStatus,
            available_beds: totalAvailBeds,
            icu_beds: icuBed ? (icuBed.available ?? 0) : (h.overview?.icu_beds || 0),
            emergency_beds: emergencyBed ? (emergencyBed.available ?? 0) : (h.overview?.emergency_beds || 0),
            isolation_beds: isolationBed ? (isolationBed.available ?? 0) : (h.overview?.isolation_beds || 0),
            doctors_available: availDocs,
            nurses_available: availNurses,
            ambulances_available: availAmbs,
          },
        };
      })
    );

    let filtered = enriched;

    if (search) {
      const q = (search as string).toLowerCase();
      filtered = filtered.filter(
        (h) => h.name.toLowerCase().includes(q) || h.area.toLowerCase().includes(q)
      );
    }

    if (resource === 'oxygen') {
      filtered = filtered.filter((h) => h.overview.oxygen_cylinders > 0);
    } else if (resource === 'icu') {
      filtered = filtered.filter((h) => h.overview.icu_beds > 0);
    } else if (resource === 'beds') {
      filtered = filtered.filter((h) => h.overview.available_beds > 0);
    }

    if (minBeds) {
      filtered = filtered.filter((h) => h.overview.available_beds >= parseInt(minBeds as string));
    }

    // Sort by distance if user coords provided
    if (userLat && userLng) {
      filtered.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
    }

    res.json(filtered);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch hospitals' });
  }
});

// Get single hospital details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const hospital = await db.collection('hospitals').findOne({
      $or: [{ hospital_id: id }, { _id: id }],
    });

    if (!hospital) {
      return res.status(404).json({ error: 'Hospital not found' });
    }

    const hid = hospital.hospital_id;

    const [departments, beds, doctors, nurses, ambulances, resources, prediction] = await Promise.all([
      db.collection('departments').find({ hospital_id: hid }).toArray(),
      db.collection('beds').find({ hospital_id: hid }).toArray(),
      db.collection('doctors').find({ hospital_id: hid }).toArray(),
      db.collection('nurses').find({ hospital_id: hid }).toArray(),
      db.collection('ambulances').find({ hospital_id: hid }).toArray(),
      db.collection('resources').find({ hospital_id: hid }).toArray(),
      db.collection('predictions').findOne({ hospital_id: hid, resource_type: 'oxygen_cylinders' }),
    ]);

    const oxy = resources.find((r: any) => r.resource_type === 'oxygen_cylinders');
    const totalAvailBeds = beds.length > 0 ? beds.reduce((acc: number, b: any) => acc + (b.available ?? 0), 0) : (hospital.overview?.available_beds || 0);
    const totalAllBeds = beds.length > 0 ? beds.reduce((acc: number, b: any) => acc + (b.total ?? 0), 0) : (hospital.overview?.total_beds || 0);
    const icuBed = beds.find((b: any) => b.category === 'ICU Beds');
    const emergencyBed = beds.find((b: any) => b.category === 'Emergency Beds');
    const isolationBed = beds.find((b: any) => b.category === 'Isolation Beds');

    const availDocs = doctors.filter((d: any) => (d.status || '').toLowerCase() === 'available').length;
    const availNurses = nurses.filter((n: any) => ['available', 'on duty', 'on_duty'].includes((n.status || '').toLowerCase())).length;
    const availAmbs = ambulances.filter((a: any) => (a.status || '').toLowerCase() === 'available').length;

    const oxyStock = oxy ? oxy.current_stock : (hospital.overview?.oxygen_cylinders || 0);
    const oxyStatus = oxy?.status || hospital.overview?.oxygen_status || (oxyStock <= 30 ? 'Critical' : oxyStock <= 60 ? 'Low' : oxyStock <= 100 ? 'Limited' : 'Good');

    res.json({
      ...hospital,
      overview: {
        ...hospital.overview,
        total_beds: totalAllBeds,
        oxygen_cylinders: oxyStock,
        oxygen_status: oxyStatus,
        available_beds: totalAvailBeds,
        icu_beds: icuBed ? (icuBed.available ?? 0) : (hospital.overview?.icu_beds || 0),
        emergency_beds: emergencyBed ? (emergencyBed.available ?? 0) : (hospital.overview?.emergency_beds || 0),
        isolation_beds: isolationBed ? (isolationBed.available ?? 0) : (hospital.overview?.isolation_beds || 0),
        doctors_available: availDocs,
        nurses_available: availNurses,
        ambulances_available: availAmbs,
      },
      departments,
      beds,
      doctors,
      nurses,
      ambulances,
      resources,
      prediction,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch hospital details' });
  }
});

// Update hospital profile (admin only)
router.put('/:id', authMiddleware, requireHospitalAdmin, requireSpecificHospital('id'), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { name, phone, emergency_phone, address, status } = req.body;
    const db = getDb();

    const updateData: any = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (emergency_phone) updateData.emergency_phone = emergency_phone;
    if (address) updateData.address = address;
    if (status) updateData.status = status;

    await db.collection('hospitals').updateOne(
      { $or: [{ hospital_id: id }, { _id: id }] },
      { $set: updateData }
    );

    await logAudit(req.user!.email, req.user!.role, 'UPDATE_HOSPITAL_PROFILE', id, updateData);

    res.json({ message: 'Hospital profile updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update hospital' });
  }
});

export default router;
