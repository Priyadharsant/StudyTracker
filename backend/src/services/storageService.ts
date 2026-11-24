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
 * Get authenticated Google Drive client using OAuth 2.0 refresh token
 */
function getGoogleDriveClient() {
  if (config.googleClientId && config.googleClientSecret && config.googleRefreshToken) {
    const oauth2Client = new google.auth.OAuth2(
      config.googleClientId,
      config.googleClientSecret,
      'http://localhost:5000/oauth2callback'
    );
    oauth2Client.setCredentials({ refresh_token: config.googleRefreshToken });
    return google.drive({ version: 'v3', auth: oauth2Client });
  }
  return null;
}

/**
 * Uploads a study document to Google Drive (with local fallback if unconfigured)
 */
export const uploadFileToStorage = async (
  file: Express.Multer.File,
  userId: string
): Promise<{ storagePath: string; url: string }> => {
  const fileExt = path.extname(file.originalname);
  const cleanOriginalName = path.basename(file.originalname, fileExt).replace(/[^a-zA-Z0-9_-]/g, '_');
  const targetFileName = `${Date.now()}-${cleanOriginalName}${fileExt}`;

  // 1. Primary: Upload to Google Drive
  const drive = getGoogleDriveClient();
  if (drive) {
    try {
      const media = {
        mimeType: file.mimetype,
        body: Readable.from(file.buffer)
      };

      const requestBody: any = {
        name: targetFileName,
        description: `StudyTrack Document uploaded by user ${userId}`
      };

      if (config.googleDriveFolderId) {
        requestBody.parents = [config.googleDriveFolderId];
      }

      const driveRes = await drive.files.create({
        requestBody,
        media,
        fields: 'id, name, webViewLink, webContentLink'
      });

      const driveFileId = driveRes.data.id;
      if (driveFileId) {
        // Set permissions so anyone with the link can view the study document
        try {
          await drive.permissions.create({
            fileId: driveFileId,
            requestBody: {
              role: 'reader',
              type: 'anyone'
            }
          });
        } catch (permErr: any) {
          console.warn('[Google Drive] Permission setting warning:', permErr.message);
        }

        const viewLink = driveRes.data.webViewLink || `https://drive.google.com/file/d/${driveFileId}/view?usp=sharing`;
        console.log(`[Google Drive] File uploaded successfully: ${targetFileName} (ID: ${driveFileId})`);

        return {
          storagePath: `gdrive://${driveFileId}/${targetFileName}`,
          url: viewLink
        };
      }
    } catch (gdriveErr: any) {
      console.error('[Google Drive] Upload failed, attempting local fallback:', gdriveErr.message || gdriveErr);
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

  const localFilePath = path.join(userDir, targetFileName);
  try {
    fs.writeFileSync(localFilePath, file.buffer);
  } catch (err: any) {
    console.error('[Storage] Error writing file to disk:', err);
    throw new Error('Failed to save document to storage: ' + (err.message || 'Disk write error'));
  }

  const relativeStoragePath = `local://${userId}/${targetFileName}`;
  return {
    storagePath: relativeStoragePath,
    url: `/api/materials/file-content/${userId}/${targetFileName}`
  };
};

/**
 * Deletes a file from Google Drive or local storage
 */
export const deleteFileFromStorage = async (storagePath: string): Promise<void> => {
  if (!storagePath) return;

  if (storagePath.startsWith('gdrive://')) {
    const driveFileId = storagePath.replace('gdrive://', '').split('/')[0];
    const drive = getGoogleDriveClient();
    if (drive) {
      try {
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
 * Retrieves direct viewing/download URL or stream from Google Drive or local storage
 */
export const getFileAccessUrl = async (
  storagePath: string
): Promise<{ type: 'url' | 'local' | 'stream'; url?: string; localPath?: string; stream?: any }> => {
  if (storagePath.startsWith('gdrive://')) {
    const driveFileId = storagePath.replace('gdrive://', '').split('/')[0];
    const drive = getGoogleDriveClient();

    if (drive) {
      try {
        const streamRes = await drive.files.get(
          { fileId: driveFileId, alt: 'media' },
          { responseType: 'stream' }
        );
        return {
          type: 'stream',
          stream: streamRes.data,
          url: `https://drive.google.com/file/d/${driveFileId}/view?usp=sharing`
        };
      } catch (streamErr: any) {
        console.warn('[Google Drive Stream] Stream retrieval error, falling back to direct URL:', streamErr.message);
      }
    }

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
