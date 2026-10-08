import { MongoClient, Db } from 'mongodb';
import fs from 'fs';
import path from 'path';

export interface DatabaseState {
  isConnected: boolean;
  isConnectedToAtlas: boolean;
  dbName: string;
  error?: string;
  atlasNotice?: string;
}

let client: MongoClient | null = null;
let dbInstance: Db | null = null;
let dbState: DatabaseState = {
  isConnected: false,
  isConnectedToAtlas: false,
  dbName: 'medirebal',
};

export async function connectToDatabase(forceRetry: boolean = false): Promise<Db> {
  if (dbInstance && !forceRetry && dbState.isConnected) {
    return dbInstance;
  }

  const rawUri = process.env.MONGODB_URI;
  console.log('[MONGODB] Connecting...');

  if (!rawUri) {
    const errorMsg = 'MONGODB_URI environment variable is not defined.';
    console.error('[MONGODB] Error: ' + errorMsg);
    dbState = {
      isConnected: false,
      isConnectedToAtlas: false,
      dbName: 'medirebal',
      error: errorMsg,
      atlasNotice: errorMsg,
    };
    throw new Error(errorMsg);
  }

  try {
    // Explicitly target medirebal database in URI if not specified in path
    let uri = rawUri.trim();
    if (uri.startsWith('mongodb+srv://') || uri.startsWith('mongodb://')) {
      try {
        const parsed = new URL(uri);
        if (!parsed.pathname || parsed.pathname === '/' || parsed.pathname === '') {
          parsed.pathname = '/medirebal';
          uri = parsed.toString();
        }
      } catch (_) {}
    }

    const testClient = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });

    await testClient.connect();
    client = testClient;

    // Explicitly select medirebal database (NOT local, admin, or test)
    const db = client.db('medirebal');
    console.log('[MONGODB] Connected');
    console.log('[MONGODB] Database: medirebal');

    // Immediately perform connection test operation
    await db.collection('connection_test').updateOne(
      { source: 'MEDIREBAL AI' },
      {
        $set: {
          source: 'MEDIREBAL AI',
          message: 'MongoDB connection working',
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );
    console.log('[MONGODB] connection_test write: SUCCESS');

    // Verify the document exists by reading it back from MongoDB
    const testDoc = await db.collection('connection_test').findOne({ source: 'MEDIREBAL AI' });
    if (!testDoc) {
      throw new Error('connection_test document could not be read back from MongoDB after write.');
    }
    console.log('[MONGODB] connection_test read: SUCCESS');

    // Create required indexes on medirebal collections
    try {
      await db.collection('users').createIndex({ email: 1 }, { unique: true });
      await db.collection('hospitals').createIndex({ hospital_id: 1 }, { unique: true });
      await db.collection('departments').createIndex({ hospital_id: 1, name: 1 });
      await db.collection('doctors').createIndex({ hospital_id: 1 });
      await db.collection('nurses').createIndex({ hospital_id: 1 });
      await db.collection('beds').createIndex({ hospital_id: 1, category: 1 });
      await db.collection('ambulances').createIndex({ hospital_id: 1, ambulance_id: 1 });
      await db.collection('resources').createIndex({ hospital_id: 1, resource_type: 1 });
      await db.collection('resource_readings').createIndex({ hospital_id: 1, resource_type: 1, timestamp: -1 });
      await db.collection('appointments').createIndex({ hospital_id: 1, appointmentDate: 1 });
      await db.collection('appointments').createIndex({ patientId: 1 });
      await db.collection('appointments').createIndex({ doctorId: 1 });
      await db.collection('emergency_requests').createIndex({ status: 1 });
      await db.collection('transfer_requests').createIndex({ status: 1 });
      await db.collection('notifications').createIndex({ user_id: 1 });
    } catch (idxErr) {
      console.warn('[MONGODB] Index creation notice:', idxErr);
    }

    dbInstance = db;
    dbState = {
      isConnected: true,
      isConnectedToAtlas: true,
      dbName: 'medirebal',
    };

    return dbInstance;
  } catch (err: any) {
    console.error('[MONGODB] Error: ' + err.message);

    if (rawUri.includes('<db_password>')) {
      console.error(
        '[MONGODB] Diagnostic Hint: The MONGODB_URI contains the literal placeholder "<db_password>". MongoDB Atlas rejects this because the placeholder must be replaced with the actual password configured for database user in Atlas.'
      );
    }

    dbInstance = null;
    dbState = {
      isConnected: false,
      isConnectedToAtlas: false,
      dbName: 'medirebal',
      error: err.message,
      atlasNotice: rawUri.includes('<db_password>')
        ? 'MONGODB_URI contains unreplaced <db_password> placeholder. Provide your MongoDB user password to connect to medirebal cluster.'
        : err.message,
    };
    throw err;
  }
}

export async function configureMongoCredentials(
  options: { password?: string; uri?: string }
): Promise<{ success: boolean; state: DatabaseState }> {
  let targetUri = '';

  if (options.uri && options.uri.trim()) {
    targetUri = options.uri.trim();
  } else if (options.password) {
    const currentUri = process.env.MONGODB_URI || '';
    const encodedPass = encodeURIComponent(options.password.trim());
    if (currentUri.includes('<db_password>')) {
      targetUri = currentUri.replace('<db_password>', encodedPass);
    } else {
      // Replace existing password in mongodb+srv://user:pass@host...
      targetUri = currentUri.replace(/(mongodb(?:\+srv)?:\/\/[^:]+:)([^@]+)(@.+)/, `$1${encodedPass}$3`);
    }
  }

  if (!targetUri) {
    throw new Error('No valid MongoDB URI or password provided');
  }

  // Ensure /medirebal database is targeted in URI
  if (targetUri.startsWith('mongodb+srv://') || targetUri.startsWith('mongodb://')) {
    try {
      const parsed = new URL(targetUri);
      if (!parsed.pathname || parsed.pathname === '/' || parsed.pathname === '') {
        parsed.pathname = '/medirebal';
        targetUri = parsed.toString();
      }
    } catch (_) {}
  }

  // Persist to .env
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
      if (envContent.includes('MONGODB_URI=')) {
        envContent = envContent.replace(/MONGODB_URI=.*(\r?\n|$)/, `MONGODB_URI="${targetUri}"$1`);
      } else {
        envContent += `\nMONGODB_URI="${targetUri}"\n`;
      }
    } else {
      envContent = `MONGODB_URI="${targetUri}"\nPORT=3000\n`;
    }
    fs.writeFileSync(envPath, envContent, 'utf8');
  } catch (fsErr) {
    console.warn('[MONGODB] Notice saving .env:', fsErr);
  }

  process.env.MONGODB_URI = targetUri;

  // Now attempt to connect
  await connectToDatabase(true);

  // If connected, automatically run seed to ensure medirebal is populated
  try {
    const { seedDatabase } = await import('./seed');
    await seedDatabase(false);
  } catch (seedErr) {
    console.warn('[MONGODB] Notice seeding on reconnect:', seedErr);
  }

  return { success: true, state: dbState };
}

export function getDb(): any {
  if (!dbInstance || !dbState.isConnected) {
    throw new Error(
      `[MONGODB] Database not connected. Root cause: ${dbState.error || 'Connection not established'}`
    );
  }
  return dbInstance;
}

export function getDatabaseState(): DatabaseState {
  return dbState;
}

export async function pingDatabase(): Promise<boolean> {
  if (!dbInstance) return false;
  await dbInstance.command({ ping: 1 });
  return true;
}
