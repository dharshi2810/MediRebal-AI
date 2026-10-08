import { Router } from 'express';
import { getDb } from '../db/mongo';
import { hashPassword, comparePassword, generateToken } from '../services/authService';
import { AuthenticatedRequest, authMiddleware, logAudit } from '../middleware/authMiddleware';

const router = Router();

// Register public user
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password, location } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const db = getDb();
    const existing = await db.collection('users').findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    const hashedPassword = await hashPassword(password);
    const newUser = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone || '',
      password: hashedPassword,
      role: 'PUBLIC_USER',
      location: location || 'Chennai',
      createdAt: new Date().toISOString(),
    };

    const result = await db.collection('users').insertOne(newUser);
    const userDoc = { ...newUser, _id: result.insertedId };
    const token = generateToken(userDoc as any);

    await logAudit(userDoc.email, 'PUBLIC_USER', 'REGISTER', undefined, { location: newUser.location });

    res.status(201).json({
      message: 'Account registered successfully',
      token,
      user: {
        id: result.insertedId,
        name: userDoc.name,
        email: userDoc.email,
        phone: userDoc.phone,
        role: userDoc.role,
        location: userDoc.location,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Registration failed' });
  }
});

// Login (public user or hospital admin)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const db = getDb();
    const user = await db.collection('users').findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user);
    await logAudit(user.email, user.role, 'LOGIN', user.hospital_id);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        hospital_id: user.hospital_id,
        location: user.location,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Login failed' });
  }
});

// Current user profile
router.get('/me', authMiddleware, async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const db = getDb();
  const user = await db.collection('users').findOne({ email: req.user.email });
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      hospital_id: user.hospital_id,
      location: user.location,
    },
  });
});

// Demo accounts endpoint for easy one-click demo access for judges
router.get('/demo-users', async (_req, res) => {
  res.json({
    publicUser: {
      role: 'PUBLIC_USER',
      email: 'patient@medirebal.org',
      password: 'patient123',
      name: 'Kavitha Raman',
      location: 'Anna Nagar, Chennai',
    },
    hospitalAdmins: [
      {
        hospital_id: 'H001',
        name: 'Dr. S. Sundararajan (Chennai Central Hospital)',
        email: 'admin.central@medirebal.org',
        password: 'hospital123',
        area: 'Chennai Central',
        note: 'High demand hub - active monitoring',
      },
      {
        hospital_id: 'H003',
        name: 'Dr. Anand Kumar (Adyar Hospital)',
        email: 'admin.adyar@medirebal.org',
        password: 'hospital123',
        area: 'Adyar',
        note: 'Surplus Hospital - High donor candidate (185 units)',
      },
      {
        hospital_id: 'H002',
        name: 'Dr. Priya Narayanan (Anna Nagar Hospital)',
        email: 'admin.annanagar@medirebal.org',
        password: 'hospital123',
        area: 'Anna Nagar',
        note: 'Healthy hospital',
      },
      {
        hospital_id: 'H004',
        name: 'Dr. Meena Ramesh (Velachery Hospital)',
        email: 'admin.velachery@medirebal.org',
        password: 'hospital123',
        area: 'Velachery',
        note: 'Healthy hospital',
      },
      {
        hospital_id: 'H005',
        name: 'Dr. K. Venkatesh (Tambaram Hospital)',
        email: 'admin.tambaram@medirebal.org',
        password: 'hospital123',
        area: 'Tambaram',
        note: 'Limited hospital',
      },
    ],
  });
});

export default router;
