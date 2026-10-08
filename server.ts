import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectToDatabase } from './backend/db/mongo';
import { seedDatabase } from './backend/db/seed';

// Import Route Handlers
import authRoutes from './backend/routes/authRoutes';
import hospitalRoutes from './backend/routes/hospitalRoutes';
import resourceRoutes from './backend/routes/resourceRoutes';
import bedRoutes from './backend/routes/bedRoutes';
import doctorRoutes from './backend/routes/doctorRoutes';
import nurseRoutes from './backend/routes/nurseRoutes';
import departmentRoutes from './backend/routes/departmentRoutes';
import ambulanceRoutes from './backend/routes/ambulanceRoutes';
import appointmentRoutes from './backend/routes/appointmentRoutes';
import emergencyRoutes from './backend/routes/emergencyRoutes';
import transferRoutes from './backend/routes/transferRoutes';
import predictionRoutes from './backend/routes/predictionRoutes';
import rebalanceRoutes from './backend/routes/rebalanceRoutes';
import notificationRoutes from './backend/routes/notificationRoutes';
import simulatorRoutes from './backend/routes/simulatorRoutes';
import geminiRoutes from './backend/routes/geminiRoutes';
import statusRoutes from './backend/routes/statusRoutes';
import healthRoutes from './backend/routes/healthRoutes';

dotenv.config({ override: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());

// API Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/beds', bedRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/nurses', nurseRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/ambulances', ambulanceRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/emergency-requests', emergencyRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/rebalance', rebalanceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/simulation', simulatorRoutes);
app.use('/api/gemini', geminiRoutes);
app.use('/api/status', statusRoutes);

async function startServer() {
  try {
    // 1. Connect DB and seed initial data
    try {
      await connectToDatabase();
      await seedDatabase(false);
    } catch (dbErr: any) {
      console.error('[MONGODB] Startup database initialization notice:', dbErr.message);
    }

    // 2. Setup Vite dev server or static distribution
    const isProduction = process.env.NODE_ENV === 'production';

    if (!isProduction) {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      console.log('Vite middleware mounted in development mode');
    } else {
      const distPath = path.resolve(__dirname, 'dist');
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
      console.log('Serving production static build from dist');
    }

    // 3. Listen on port 3000
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`====================================================`);
      console.log(`MEDIREBAL AI - Full-Stack Server Running on port ${PORT}`);
      console.log(`Track: HN-AI-05 Cross-Hospital Resource Rebalance`);
      console.log(`Open: http://localhost:${PORT}`);
      console.log(`====================================================`);
    });
  } catch (err) {
    console.error('Fatal error starting server:', err);
    process.exit(1);
  }
}

startServer();
