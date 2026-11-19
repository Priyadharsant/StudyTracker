import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import { Readable } from 'stream';
import { getSupabase, LOCAL_UPLOADS_DIR } from '../config/supabase';
import { config } from '../config/env';

/**
 * Uploads file buffer.
 * Priority:
 * 1. Google Drive API (using configured API key / Drive service)
 * 2. Supabase Storage (if configured)
 * 3. Local disk fallback
 */
export const uploadFileToStorage = async (
  file: Express.Multer.File,
  userId: string
): Promise<{ storagePath: string; url: string }> => {
  const fileExt = path.extname(file.originalname);
  const cleanOriginalName = path.basename(file.originalname, fileExt).replace(/[^a-zA-Z0-9_-]/g, '_');
  const uniqueName = `${userId}/${Date.now()}-${cleanOriginalName}${fileExt}`;

  // Try Google Drive API if available
  if (config.googleApiKey) {
    try {
      const drive = google.drive({ version: 'v3', auth: config.googleApiKey });
      const stream = new Readable();
      stream.push(file.buffer);
      stream.push(null);

      const driveRes = await drive.files.create({
        requestBody: {
          name: `${cleanOriginalName}${fileExt}`,
          mimeType: file.mimetype,
          description: `StudyTrack document uploaded by user ${userId}`
        },
        media: {
          mimeType: file.mimetype,
          body: stream
        },
        fields: 'id, name, webViewLink, webContentLink'
      });

      if (driveRes.data && driveRes.data.id) {
        console.log(`[Google Drive] File uploaded successfully with ID: ${driveRes.data.id}`);
        const driveFileId = driveRes.data.id;
        return {
          storagePath: `gdrive://${driveFileId}/${cleanOriginalName}${fileExt}`,
          url: driveRes.data.webViewLink || `https://drive.google.com/file/d/${driveFileId}/view`
        };
      }
    } catch (gdriveErr: any) {
      console.warn('[Google Drive API] Notice: Standard API Key without Service Account / OAuth credentials has restricted write permissions on public Drive endpoints. Proceeding with secure storage fallback:', gdriveErr.message || gdriveErr);
    }
  }

  // Supabase Storage
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.storage
        .from(config.supabaseBucket)
        .upload(uniqueName, file.buffer, {
          contentType: file.mimetype,
          upsert: false
        });

      if (error) {
        console.error('[Supabase Storage] Upload error:', error);
        throw error;
      }

      const { data: signedData } = await supabase.storage
        .from(config.supabaseBucket)
        .createSignedUrl(uniqueName, 3600);

      return {
        storagePath: uniqueName,
        url: signedData?.signedUrl || ''
      };
    } catch (supabaseError) {
      console.warn('[Supabase Storage] Failed, falling back to local storage:', supabaseError);
    }
  }

  // Local fallback storage
  const userDir = path.join(LOCAL_UPLOADS_DIR, userId);
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }

  const localFileName = `${Date.now()}-${cleanOriginalName}${fileExt}`;
  const localFilePath = path.join(userDir, localFileName);
  fs.writeFileSync(localFilePath, file.buffer);

  const relativeStoragePath = `local://${userId}/${localFileName}`;
  return {
    storagePath: relativeStoragePath,
    url: `/api/materials/file-content/${userId}/${localFileName}`
  };
};

/**
 * Deletes a file from Google Drive, Supabase Storage, or local fallback
 */
export const deleteFileFromStorage = async (storagePath: string): Promise<void> => {
  if (!storagePath) return;

  if (storagePath.startsWith('gdrive://')) {
    const driveFileId = storagePath.replace('gdrive://', '').split('/')[0];
    if (config.googleApiKey) {
      try {
        const drive = google.drive({ version: 'v3', auth: config.googleApiKey });
        await drive.files.delete({ fileId: driveFileId });
        console.log(`[Google Drive] Deleted file: ${driveFileId}`);
      } catch (err: any) {
        console.warn('[Google Drive] Delete error:', err.message);
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
    return;
  }

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { error } = await supabase.storage
        .from(config.supabaseBucket)
        .remove([storagePath]);
      if (error) {
        console.error('[Supabase Storage] Delete error:', error);
      }
    } catch (err) {
      console.error('[Supabase Storage] Exception during delete:', err);
    }
  }
};

/**
 * Retrieves signed URL for viewing/downloading or retrieves local file path/stream
 */
export const getFileAccessUrl = async (
  storagePath: string
): Promise<{ type: 'url' | 'local'; url?: string; localPath?: string }> => {
  if (storagePath.startsWith('gdrive://')) {
    const driveFileId = storagePath.replace('gdrive://', '').split('/')[0];
    return {
      type: 'url',
      url: `https://drive.google.com/file/d/${driveFileId}/view`
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

  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase.storage
      .from(config.supabaseBucket)
      .createSignedUrl(storagePath, 3600);

    if (!error && data?.signedUrl) {
      return {
        type: 'url',
        url: data.signedUrl
      };
    }
  }

  return { type: 'url', url: '' };
};
