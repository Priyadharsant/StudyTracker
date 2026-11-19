import { Router } from 'express';
import { validateImportJson, importSubject, importUnit } from '../controllers/importController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.post('/validate', validateImportJson);
router.post('/subject', importSubject);
router.post('/unit', importUnit);

export default router;
