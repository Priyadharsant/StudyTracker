import { Router } from 'express';
import {
  getSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
  duplicateSubject
} from '../controllers/subjectController';
import { getUnitsBySubject, createUnit } from '../controllers/unitController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', getSubjects);
router.post('/', createSubject);
router.get('/:id', getSubjectById);
router.patch('/:id', updateSubject);
router.delete('/:id', deleteSubject);
router.post('/:id/duplicate', duplicateSubject);

// Nested unit routes
router.get('/:id/units', getUnitsBySubject);
router.post('/:id/units', createUnit);

export default router;
