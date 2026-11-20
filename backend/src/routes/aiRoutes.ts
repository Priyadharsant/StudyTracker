import { Router } from 'express';
import { generateAIChecklist, mergeUnitTopics, insertUnitsIntoSubject, smartAISearch, generateAINotes } from '../controllers/aiController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Require authentication for all AI endpoints
router.use(authenticateToken);

// Generate structured checklist from syllabus
router.post('/generate-checklist', generateAIChecklist);

// Merge generated topics into an existing unit safely
router.post('/merge-unit-topics', mergeUnitTopics);

// Insert multiple AI generated units into an existing subject
router.post('/insert-units-into-subject', insertUnitsIntoSubject);

// Smart AI Search across subjects, topics, and notes
router.post('/smart-search', smartAISearch);

// AI Note Generator with noise cleaner and exam presets
router.post('/generate-notes', generateAINotes);

export default router;
