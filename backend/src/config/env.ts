import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || '',
  jwtSecret: process.env.JWT_SECRET || 'dev_jwt_secret_change_in_production',
  jwtExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '7d',
  googleApiKey: process.env.GOOGLE_API_KEY || '',
  frontendUrl: process.env.FRONTEND_URL || '*',
  maxFileSize: process.env.MAX_FILE_SIZE || '25MB'
};
