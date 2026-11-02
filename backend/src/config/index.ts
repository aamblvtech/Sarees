import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Check workspace root .env first, fallback to backend local directory
const rootEnvPath = path.resolve(__dirname, '../../../.env');
const backendEnvPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
} else {
  dotenv.config({ path: backendEnvPath });
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  jwtSecret: process.env.JWT_SECRET || 'sajee_luxury_jwt_secret_drape_your_elegance_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  sessionExpiryMinutes: parseInt(process.env.SESSION_EXPIRY_MINUTES || '60', 10),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://sajee_user:sajee_pass_2026@localhost:5432/sajee_db',
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000').split(','),
  uploadDir: path.resolve(__dirname, '../../uploads'),
  maxUploadSizeBytes: 10 * 1024 * 1024, // 10MB
};
