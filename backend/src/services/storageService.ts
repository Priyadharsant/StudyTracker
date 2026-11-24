import fs from 'fs';
import path from 'path';
import os from 'os';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config/env';

// Determine safe storage folder for local caching / fallback (serverless safe in os.tmpdir)
export const LOCAL_UPLOADS_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), 'studytrack-uploads')
  : path.join(__dirname, '../../uploads');

try {
  if (!fs.existsSync(LOCAL_UPLOADS_DIR)) {
    fs.mkdirSync(LOCAL_UPLOADS_DIR, { recursive: true });
  }
} catch (e) {
  // Ignored in read-only environments
}

// Lazy-loaded Supabase client
let supabaseClient: SupabaseClient | null = null;
function getSupabaseClient(): SupabaseClient | null {
  if (config.supabaseUrl && config.supabaseServiceRoleKey) {
    if (!supabaseClient) {
      supabaseClient = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
        auth: { persistSession: false }
      });
    }
    return supabaseClient;
  }
  return null;
}

/**
 * Uploads a study document to Supabase Storage (with local disk fallback if unconfigured)
 */
export const uploadFileToStorage = async (
  file: Express.Multer.File,
  userId: string
): Promise<{ storagePath: string; url: string }> => {
  const fileExt = path.extname(file.originalname);
  const cleanOriginalName = path.basename(file.originalname, fileExt).replace(/[^a-zA-Z0-9_-]/g, '_');
  const targetFileName = `${userId}/${Date.now()}-${cleanOriginalName}${fileExt}`;

  // 1. Primary: Upload to Supabase Storage
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.storage
        .from(config.supabaseBucket)
        .upload(targetFileName, file.buffer, {
          contentType: file.mimetype,
          upsert: true
        });

      if (error) {
        console.error('[Supabase Storage] Upload error:', error.message);
        throw error;
      }

      // Get public URL directly (bucket is public, allowing seamless embed in iframe & img)
      const { data: publicUrlData } = supabase.storage
        .from(config.supabaseBucket)
        .getPublicUrl(targetFileName);

      const publicUrl = publicUrlData.publicUrl;
      console.log(`[Supabase Storage] File uploaded successfully: ${targetFileName}`);

      return {
        storagePath: `supabase://${config.supabaseBucket}/${targetFileName}`,
        url: publicUrl
      };
    } catch (supabaseErr: any) {
      console.warn('[Supabase Storage] Failed, attempting local fallback:', supabaseErr.message || supabaseErr);
    }
  }

  // 2. Fallback: Local disk storage
  const userDir = path.join(LOCAL_UPLOADS_DIR, userId);
  try {
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
  } catch (err) {
    // Ignore
  }

  const localFileName = `${Date.now()}-${cleanOriginalName}${fileExt}`;
  const localFilePath = path.join(userDir, localFileName);
  try {
    fs.writeFileSync(localFilePath, file.buffer);
  } catch (err: any) {
    console.error('[Storage] Error writing file to disk:', err);
    throw new Error('Failed to save document to storage: ' + (err.message || 'Disk write error'));
  }

  const relativeStoragePath = `local://${userId}/${localFileName}`;
  return {
    storagePath: relativeStoragePath,
    url: `/api/materials/file-content/${userId}/${localFileName}`
  };
};

/**
 * Deletes a file from Supabase Storage or local storage
 */
export const deleteFileFromStorage = async (storagePath: string): Promise<void> => {
  if (!storagePath) return;

  if (storagePath.startsWith('supabase://')) {
    const rawPath = storagePath.replace('supabase://', '');
    const parts = rawPath.split('/');
    const bucket = parts[0] || config.supabaseBucket;
    const filePath = parts.slice(1).join('/');

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.storage.from(bucket).remove([filePath]);
        console.log(`[Supabase Storage] Deleted file: ${filePath}`);
      } catch (err: any) {
        console.warn('[Supabase Storage] Delete warning:', err.message);
      }
    }
    return;
  }

  if (storagePath.startsWith('local://')) {
    const relativePath = storagePath.replace('local://', '');
    const localFilePath = path.join(LOCAL_UPLOADS_DIR, relativePath);
    if (fs.existsSync(localFilePath)) {
      try {
        fs.unlinkSync(localFilePath);
      } catch (err) {
        console.error('Error deleting local file:', err);
      }
    }
  }
};

/**
 * Retrieves direct viewing/download URL from Supabase Storage or local storage
 */
export const getFileAccessUrl = async (
  storagePath: string
): Promise<{ type: 'url' | 'local' | 'stream'; url?: string; localPath?: string; stream?: any }> => {
  if (storagePath.startsWith('supabase://')) {
    const rawPath = storagePath.replace('supabase://', '');
    const parts = rawPath.split('/');
    const bucket = parts[0] || config.supabaseBucket;
    const filePath = parts.slice(1).join('/');

    const supabase = getSupabaseClient();
    if (supabase) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
      return {
        type: 'url',
        url: data.publicUrl
      };
    }
  }

  if (storagePath.startsWith('gdrive://')) {
    const driveFileId = storagePath.replace('gdrive://', '').split('/')[0];
    return {
      type: 'url',
      url: `https://drive.google.com/file/d/${driveFileId}/view?usp=sharing`
    };
  }

  if (storagePath.startsWith('local://')) {
    const relativePath = storagePath.replace('local://', '');
    const localFilePath = path.join(LOCAL_UPLOADS_DIR, relativePath);
    return {
      type: 'local',
      localPath: localFilePath
    };
  }

  return { type: 'url', url: '' };
};
