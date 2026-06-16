import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const LOCAL_URI = 'mongodb://localhost:27017/event_management';
const ATLAS_URI = process.env.MONGO_URI;

if (!ATLAS_URI) {
  console.error('❌ MONGO_URI not found in .env');
  process.exit(1);
}

const migrate = async () => {
  console.log('🔗 Connecting to local MongoDB...');
  const localConn = await mongoose.createConnection(LOCAL_URI).asPromise();
  console.log('✅ Connected to local MongoDB');

  console.log('🔗 Connecting to Atlas...');
  const atlasConn = await mongoose.createConnection(ATLAS_URI, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  }).asPromise();
  console.log('✅ Connected to Atlas');

  const collections = ['events', 'users', 'registrations'];

  for (const name of collections) {
    const docs = await localConn.db.collection(name).find({}).toArray();
    console.log(`📦 ${name}: ${docs.length} documents found`);

    if (docs.length === 0) continue;

    // Remove _id from subdocuments to avoid duplicate key errors
    const cleanDocs = docs.map(({ _id, ...rest }) => ({
      ...rest,
      _id,
    }));

    // Drop existing collection on Atlas then re-insert
    await atlasConn.db.collection(name).drop().catch(() => {});
    await atlasConn.db.collection(name).insertMany(cleanDocs);
    console.log(`   ✅ ${name}: ${docs.length} documents migrated`);
  }

  await localConn.close();
  await atlasConn.close();
  console.log('\n🎉 Migration complete!');
};

migrate().catch((err) => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
