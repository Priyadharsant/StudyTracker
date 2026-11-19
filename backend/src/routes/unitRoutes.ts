import { Router } from 'express';
import { updateUnit, deleteUnit } from '../controllers/unitController';
import { getTopicsByUnit, createTopic } from '../controllers/topicController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.patch('/:id', updateUnit);
router.delete('/:id', deleteUnit);

// Nested topic routes
router.get('/:id/topics', getTopicsByUnit);
router.post('/:id/topics', createTopic);

export default router;
