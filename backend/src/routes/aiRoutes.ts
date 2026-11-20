import { Router } from 'express';
import { generateAIChecklist, mergeUnitTopics, smartAISearch } from '../controllers/aiController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Require authentication for all AI endpoints
router.use(authenticateToken);

// Generate structured checklist from syllabus
router.post('/generate-checklist', generateAIChecklist);

// Merge generated topics into an existing unit safely
router.post('/merge-unit-topics', mergeUnitTopics);

// Smart AI Search across subjects, topics, and notes
router.post('/smart-search', smartAISearch);

export default router;
