import fs from 'fs';
import path from 'path';
import os from 'os';
import { google } from 'googleapis';
import { Readable } from 'stream';
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

/**
 * Uploads a study document using Google Drive API
 */
export const uploadFileToStorage = async (
  file: Express.Multer.File,
  userId: string
): Promise<{ storagePath: string; url: string }> => {
  const fileExt = path.extname(file.originalname);
  const cleanOriginalName = path.basename(file.originalname, fileExt).replace(/[^a-zA-Z0-9_-]/g, '_');

  // Local storage (reliable, direct access for study documents)
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
 * Deletes a file from Google Drive or local storage
 */
export const deleteFileFromStorage = async (storagePath: string): Promise<void> => {
  if (!storagePath) return;

  if (storagePath.startsWith('gdrive://')) {
    const driveFileId = storagePath.replace('gdrive://', '').split('/')[0];
    if (config.googleApiKey) {
      try {
        const drive = google.drive({ version: 'v3', auth: config.googleApiKey });
        await drive.files.delete({ fileId: driveFileId });
        console.log(`[Google Drive API] Deleted file: ${driveFileId}`);
      } catch (err: any) {
        console.warn('[Google Drive API] Delete warning:', err.message);
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
 * Retrieves direct viewing/download URL from Google Drive or local storage
 */
export const getFileAccessUrl = async (
  storagePath: string
): Promise<{ type: 'url' | 'local'; url?: string; localPath?: string }> => {
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
