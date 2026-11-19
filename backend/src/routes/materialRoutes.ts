import { Router } from 'express';
import {
  uploadFileMaterial,
  uploadUnitFileMaterial,
  updateMaterial,
  deleteMaterial,
  viewMaterial,
  downloadMaterial,
  streamLocalFile
} from '../controllers/materialController';
import { authenticateToken } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.use(authenticateToken);

router.post('/upload', upload.single('file'), uploadFileMaterial);
router.post('/upload-unit', upload.single('file'), uploadUnitFileMaterial);
router.patch('/:id', updateMaterial);
router.delete('/:id', deleteMaterial);
router.get('/:id/view', viewMaterial);
router.get('/:id/download', downloadMaterial);
router.get('/file-content/:fileUserId/:filename', streamLocalFile);

export default router;
