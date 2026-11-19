import { Router } from 'express';
import { updateNoteById, deleteNote, getAllNotes } from '../controllers/noteController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', getAllNotes);
router.patch('/:id', updateNoteById);
router.delete('/:id', deleteNote);

export default router;
