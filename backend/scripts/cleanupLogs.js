import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logsDir = path.join(__dirname, '../logs');
const MAX_LOG_AGE_DAYS = 30; // Keep logs for 30 days
const MAX_LOG_SIZE_MB = 50; // Maximum total log size in MB

const cleanupLogs = () => {
  if (!fs.existsSync(logsDir)) {
    logger.info('Logs directory does not exist');
    return;
  }

  const now = Date.now();
  const files = fs.readdirSync(logsDir);
  let deletedCount = 0;
  let totalSize = 0;

  files.forEach(file => {
    const filePath = path.join(logsDir, file);
    const stats = fs.statSync(filePath);
    const fileAge = (now - stats.mtimeMs) / (1000 * 60 * 60 * 24); // Age in days

    // Delete old log files
    if (fileAge > MAX_LOG_AGE_DAYS) {
      const fileSize = stats.size;
      totalSize += fileSize;
      fs.unlinkSync(filePath);
      deletedCount++;
      logger.debug(`Deleted old log file: ${file} (${Math.round(fileAge)} days old, ${(fileSize / 1024).toFixed(2)} KB)`);
    }
  });

  // Check total logs size
  const remainingFiles = fs.readdirSync(logsDir);
  let totalLogSize = 0;
  remainingFiles.forEach(file => {
    const filePath = path.join(logsDir, file);
    const stats = fs.statSync(filePath);
    totalLogSize += stats.size;
  });

  const totalLogSizeMB = totalLogSize / 1024 / 1024;
  if (totalLogSizeMB > MAX_LOG_SIZE_MB) {
    logger.warn(`Total logs size (${totalLogSizeMB.toFixed(2)} MB) exceeds limit (${MAX_LOG_SIZE_MB} MB). Consider manual cleanup.`);
  }

  if (deletedCount > 0) {
    logger.info(`Log cleanup complete. Deleted ${deletedCount} old files (${(totalSize / 1024 / 1024).toFixed(2)} MB freed).`);
  } else {
    logger.info('No old logs to clean up.');
  }
};

cleanupLogs();