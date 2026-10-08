import { getDb } from '../db/mongo';
import { predictHospitalShortage } from './mlPredictionService';
import { INITIAL_HOSPITALS } from '../db/seed';

export interface SimulatorStatus {
  isRunning: boolean;
  tickCount: number;
  intervalMs: number;
  lastTickTime: string | null;
  scenario: string;
}

let timer: NodeJS.Timeout | null = null;
let tickCount = 0;
let intervalMs = 4000;
let lastTickTime: string | null = null;

export async function tickSimulation() {
  const db = getDb();
  tickCount++;
  lastTickTime = new Date().toISOString();

  // 1. Process each hospital oxygen consumption
  // H001: rapid depletion (-2 to -3 units per tick in active demo mode)
  // H003: steady surplus (slight fluctuation 180 - 185)
  // H002: slow depletion (-0.5)
  // H004: stable
  // H005: moderate (-0.8)

  const adjustments: Record<string, number> = {
    H001: -2, // Rapid depletion for the demo!
    H002: Math.random() > 0.5 ? -1 : 0,
    H003: Math.random() > 0.8 ? -1 : 0, // Fortis Malar stays high surplus!
    H004: Math.random() > 0.7 ? -1 : 0,
    H005: Math.random() > 0.6 ? -1 : 0,
  };

  for (const [hid, delta] of Object.entries(adjustments)) {
    const res = await db.collection('resources').findOne({
      hospital_id: hid,
      resource_type: 'oxygen_cylinders',
    });

    if (res) {
      let newStock = Math.max(5, res.current_stock + delta);
      // If H001 drops below 15 in long demo, loop back to 48 so judges can watch the shortage cycle repeatedly
      if (hid === 'H001' && newStock <= 15) {
        newStock = 48;
      }

      await db.collection('resources').updateOne(
        { hospital_id: hid, resource_type: 'oxygen_cylinders' },
        {
          $set: {
            current_stock: newStock,
            updated_at: new Date().toISOString(),
          },
        }
      );

      // Record live reading in resource_readings
      await db.collection('resource_readings').insertOne({
        hospital_id: hid,
        resource_type: 'oxygen_cylinders',
        quantity: newStock,
        timestamp: new Date().toISOString(),
      });

      // Update overview in hospital doc
      await db.collection('hospitals').updateOne(
        { hospital_id: hid },
        { $set: { 'overview.oxygen_cylinders': newStock } }
      );
    }
  }

  // Recalculate ML predictions for all hospitals on each tick
  try {
    for (const h of INITIAL_HOSPITALS) {
      await predictHospitalShortage(h.hospital_id);
    }
  } catch (err) {
    console.warn('Simulation prediction note:', err);
  }
}

export function startSimulation(speed: number = 4000): SimulatorStatus {
  if (timer) {
    clearInterval(timer);
  }
  intervalMs = speed;
  timer = setInterval(async () => {
    try {
      await tickSimulation();
    } catch (err) {
      console.warn('Simulation tick note:', err);
    }
  }, intervalMs);

  return getSimulatorStatus();
}

export function pauseSimulation(): SimulatorStatus {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  return getSimulatorStatus();
}

export async function resetSimulation(): Promise<SimulatorStatus> {
  pauseSimulation();
  tickCount = 0;
  lastTickTime = null;

  const db = getDb();
  // Reset stocks to initial demo values
  const defaultStocks: Record<string, number> = {
    H001: 45, // Critical/rapid depletion starter
    H002: 120,
    H003: 185, // Surplus donor starter
    H004: 90,
    H005: 80,
  };

  for (const [hid, stock] of Object.entries(defaultStocks)) {
    await db.collection('resources').updateOne(
      { hospital_id: hid, resource_type: 'oxygen_cylinders' },
      { $set: { current_stock: stock, updated_at: new Date().toISOString() } }
    );
    await db.collection('hospitals').updateOne(
      { hospital_id: hid },
      { $set: { 'overview.oxygen_cylinders': stock } }
    );
  }

  // Re-run predictions with initial baseline
  for (const h of INITIAL_HOSPITALS) {
    await predictHospitalShortage(h.hospital_id);
  }

  return getSimulatorStatus();
}

export function getSimulatorStatus(): SimulatorStatus {
  return {
    isRunning: timer !== null,
    tickCount,
    intervalMs,
    lastTickTime,
    scenario: 'H001 Rapid Oxygen Depletion vs H003 High Surplus (Chennai District)',
  };
}
