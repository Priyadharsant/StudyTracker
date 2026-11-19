import { Router } from 'express';
import {
  getSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
  duplicateSubject,
  getOrGenerateShareLink,
  toggleSubjectSharing,
  getSharedSubject
} from '../controllers/subjectController';
import { getUnitsBySubject, createUnit } from '../controllers/unitController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Public route: access shared subject with shareCode (No auth required)
router.get('/shared/:code', getSharedSubject);

// Authenticated routes below
router.use(authenticateToken);

router.get('/', getSubjects);
router.post('/', createSubject);
router.get('/:id', getSubjectById);
router.patch('/:id', updateSubject);
router.delete('/:id', deleteSubject);
router.post('/:id/duplicate', duplicateSubject);

// Sharing endpoints
router.get('/:id/share', getOrGenerateShareLink);
router.post('/:id/share', toggleSubjectSharing);

// Nested unit routes
router.get('/:id/units', getUnitsBySubject);
router.post('/:id/units', createUnit);

export default router;
