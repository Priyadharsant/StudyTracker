import multer from 'multer';

// Keep file in memory for streaming directly to Supabase Storage or fallback
const storage = multer.memoryStorage();

// Allowed file types: pdf, doc, docx, ppt, pptx, txt, images
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml'
];

export const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25 MB max
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype) || file.originalname.match(/\.(pdf|docx?|pptx?|txt|png|jpe?g|webp|svg)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Please upload PDF, Word, PowerPoint, Text or Image documents.'));
    }
  }
});
