import bcrypt from 'bcryptjs';
import { getDb } from './mongo';
import { Hospital, User, Doctor, Nurse, Department, BedCategory, Ambulance, ResourceItem, ResourceReading } from '../models/types';
import { DEMO_HOSPITALS, runIdempotentSeed } from '../../scripts/seed-mongodb';

export const INITIAL_HOSPITALS: Hospital[] = DEMO_HOSPITALS;

export async function seedDatabase(forceReset: boolean = false) {
  if (forceReset) {
    const db = getDb();
    await db.collection('hospitals').deleteMany({});
    await db.collection('users').deleteMany({});
    await db.collection('doctors').deleteMany({});
    await db.collection('nurses').deleteMany({});
    await db.collection('departments').deleteMany({});
    await db.collection('resources').deleteMany({});
    await db.collection('resource_readings').deleteMany({});
    await db.collection('beds').deleteMany({});
    await db.collection('ambulances').deleteMany({});
    await db.collection('appointments').deleteMany({});
    await db.collection('emergency_requests').deleteMany({});
    await db.collection('transfer_requests').deleteMany({});
    await db.collection('notifications').deleteMany({});
    await db.collection('audit_logs').deleteMany({});
  }

  await runIdempotentSeed();
}
