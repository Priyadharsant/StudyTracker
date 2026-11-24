import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || '',
  jwtSecret: process.env.JWT_SECRET || 'dev_jwt_secret_change_in_production',
  jwtExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '7d',
  googleApiKey: process.env.GOOGLE_API_KEY || '',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '',
  supabaseBucket: process.env.SUPABASE_BUCKET || 'studytrack-documents',
  frontendUrl: process.env.FRONTEND_URL || '*',
  maxFileSize: process.env.MAX_FILE_SIZE || '25MB',
  groqApiKey: process.env.GROQ_API_KEY || process.env.GROG_API || '',
  groqModel: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
  groqFallbackModels: (process.env.GROQ_FALLBACK_MODELS || 'openai/gpt-oss-20b,openai/gpt-oss-safeguard-20b,qwen/qwen3.8-27b')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean)
};
