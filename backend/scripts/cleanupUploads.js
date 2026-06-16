import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.join(__dirname, '../uploads');
const MAX_AGE_DAYS = 30; // Delete files older than 30 days

const cleanupUploads = () => {
  if (!fs.existsSync(uploadsDir)) {
    logger.info('Uploads directory does not exist');
    return;
  }

  const now = Date.now();
  const files = fs.readdirSync(uploadsDir);
  let deletedCount = 0;
  let totalSize = 0;

  files.forEach(file => {
    const filePath = path.join(uploadsDir, file);
    const stats = fs.statSync(filePath);
    const fileAge = (now - stats.mtimeMs) / (1000 * 60 * 60 * 24); // Age in days

    if (fileAge > MAX_AGE_DAYS) {
      const fileSize = stats.size;
      totalSize += fileSize;
      fs.unlinkSync(filePath);
      deletedCount++;
      logger.debug(`Deleted old file: ${file} (${Math.round(fileAge)} days old, ${(fileSize / 1024).toFixed(2)} KB)`);
    }
  });

  if (deletedCount > 0) {
    logger.info(`Cleanup complete. Deleted ${deletedCount} old files (${(totalSize / 1024 / 1024).toFixed(2)} MB freed).`);
  } else {
    logger.info('No old files to clean up.');
  }
};

cleanupUploads();