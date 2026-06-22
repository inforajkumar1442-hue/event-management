import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const LOCAL_URI = 'mongodb://localhost:27017/event_management';
const ATLAS_URI = process.env.MONGO_URI;

if (!ATLAS_URI) {
  logger.error('MONGO_URI not found in .env');
  process.exit(1);
}

const migrate = async () => {
  logger.info('Connecting to local MongoDB...');
  const localConn = await mongoose.createConnection(LOCAL_URI).asPromise();
  logger.info('Connected to local MongoDB');

  logger.info('Connecting to Atlas...');
  const atlasConn = await mongoose.createConnection(ATLAS_URI, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  }).asPromise();
  logger.info('Connected to Atlas');

  const collections = ['events', 'users', 'registrations'];

  for (const name of collections) {
    const docs = await localConn.db.collection(name).find({}).toArray();
    logger.info(`${name}: ${docs.length} documents found`);

    if (docs.length === 0) continue;

    const cleanDocs = docs.map(({ _id, ...rest }) => ({
      ...rest,
      _id,
    }));

    await atlasConn.db.collection(name).drop().catch(() => {});
    await atlasConn.db.collection(name).insertMany(cleanDocs);
    logger.info(`${name}: ${docs.length} documents migrated`);
  }

  await localConn.close();
  await atlasConn.close();
  logger.info('Migration complete!');
};

migrate().catch((err) => {
  logger.error('Migration failed: ' + err.message);
  process.exit(1);
});
