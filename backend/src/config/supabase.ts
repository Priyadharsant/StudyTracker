import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from './env';
import fs from 'fs';
import path from 'path';

// If valid supabase credentials exist, initialize client
let supabaseClient: SupabaseClient | null = null;

if (config.supabaseUrl && config.supabaseKey && !config.supabaseUrl.includes('placeholder')) {
  try {
    supabaseClient = createClient(config.supabaseUrl, config.supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    console.log('[Supabase] Initialized Supabase client with private bucket:', config.supabaseBucket);
  } catch (err) {
    console.warn('[Supabase] Failed to initialize Supabase client:', err);
  }
} else {
  console.log('[Supabase] Running in local fallback storage mode (Supabase credentials not configured).');
}

export const getSupabase = () => supabaseClient;

// Helper to ensure local uploads folder exists for fallback or temporary staging
export const LOCAL_UPLOADS_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(LOCAL_UPLOADS_DIR)) {
  fs.mkdirSync(LOCAL_UPLOADS_DIR, { recursive: true });
}
