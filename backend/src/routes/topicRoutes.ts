import { Router } from 'express';
import {
  updateTopic,
  updateTopicProgress,
  deleteTopic,
  moveTopic
} from '../controllers/topicController';
import { getMaterialsByTopic, createUrlMaterial } from '../controllers/materialController';
import { getNotesByTopic, createOrUpdateNote } from '../controllers/noteController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.patch('/:id', updateTopic);
router.patch('/:id/progress', updateTopicProgress);
router.patch('/:id/move', moveTopic);
router.delete('/:id', deleteTopic);

// Nested materials for topic
router.get('/:id/materials', getMaterialsByTopic);
router.post('/:id/materials', createUrlMaterial);

// Nested notes for topic
router.get('/:id/notes', getNotesByTopic);
router.post('/:id/notes', createOrUpdateNote);

export default router;
