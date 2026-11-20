import { Response } from 'express';
import { Types } from 'mongoose';
import { Subject } from '../models/Subject';
import { Unit } from '../models/Unit';
import { Topic } from '../models/Topic';
import { Material } from '../models/Material';
import { Note } from '../models/Note';
import { AuthenticatedRequest } from '../types';
import {
  generateChecklistWithGroq,
  checkUserRateLimit,
  smartSearchWithGroq
} from '../services/aiService';
import {
  fullSubjectImportSchema,
  singleUnitImportSchema
} from '../validators/importValidators';

export const generateAIChecklist = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  // Rate limit check
  const rateLimitStatus = checkUserRateLimit(userId);
  if (!rateLimitStatus.allowed) {
    res.status(429).json({
      success: false,
      message: `AI request limit reached. You can make up to 15 requests every 15 minutes. Please try again in ${rateLimitStatus.resetInSec} seconds.`,
      resetInSeconds: rateLimitStatus.resetInSec
    });
    return;
  }

  const { mode, content, subjectName, unitName } = req.body;

  // Validation
  if (!mode || (mode !== 'subject' && mode !== 'unit')) {
    res.status(400).json({
      success: false,
      message: 'Invalid mode. Mode must be either "subject" or "unit".'
    });
    return;
  }

  if (!content || typeof content !== 'string' || content.trim().length < 10) {
    res.status(400).json({
      success: false,
      message: 'Please provide detailed syllabus or study notes (at least 10 characters).'
    });
    return;
  }

  // Limit content length to prevent token overflow (approx 35,000 characters)
  if (content.length > 35000) {
    res.status(400).json({
      success: false,
      message: 'Input content exceeds the maximum allowed size (35,000 characters). Please paste smaller sections or single units.'
    });
    return;
  }

  try {
    const generatedData = await generateChecklistWithGroq({
      mode,
      content,
      subjectName,
      unitName
    });

    res.status(200).json({
      success: true,
      message: 'AI checklist generated successfully!',
      data: generatedData,
      mode
    });
  } catch (err: any) {
    console.error('generateAIChecklist handler error:', err.message || err);
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: err.message || 'An error occurred during AI checklist generation.',
      validationErrors: err.validationErrors || undefined
    });
  }
};

/**
 * Merge generated unit topics into an EXISTING unit without deleting unit or losing other units
 * or reset other units' topic completion states.
 * Optionally can append or replace topics in that unit.
 */
export const mergeUnitTopics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  const { unitId, topics, mergeMode = 'append' } = req.body;

  if (!unitId || !Types.ObjectId.isValid(unitId)) {
    res.status(400).json({ success: false, message: 'Valid unitId is required' });
    return;
  }

  if (!Array.isArray(topics) || topics.length === 0) {
    res.status(400).json({ success: false, message: 'At least one topic is required to merge' });
    return;
  }

  // Check unit ownership
  const unit = await Unit.findOne({ _id: unitId, ownerId: userId });
  if (!unit) {
    res.status(404).json({ success: false, message: 'Unit not found or unauthorized' });
    return;
  }

  try {
    let startingOrder = 0;
    if (mergeMode === 'append') {
      const maxOrderTopic = await Topic.findOne({ unitId: unit._id, ownerId: userId }).sort({ order: -1 }).select('order');
      startingOrder = maxOrderTopic ? maxOrderTopic.order + 1 : 0;
    } else if (mergeMode === 'replace') {
      // If user explicitly chooses to replace topics of THIS unit only:
      await Material.deleteMany({ unitId: unit._id, ownerId: userId });
      await Topic.deleteMany({ unitId: unit._id, ownerId: userId });
      startingOrder = 0;
    }

    const createdTopics = [];
    for (let i = 0; i < topics.length; i++) {
      const t = topics[i];
      if (!t.title || typeof t.title !== 'string') continue;

      const createdTopic = await Topic.create({
        ownerId: new Types.ObjectId(userId),
        subjectId: unit.subjectId,
        unitId: unit._id,
        title: t.title.trim(),
        description: t.description || '',
        completed: false,
        priority: 'medium',
        order: startingOrder + i
      });

      if (Array.isArray(t.materials) && t.materials.length > 0) {
        const materialDocs = t.materials
          .filter((m: any) => m.url && typeof m.url === 'string' && (m.url.startsWith('http://') || m.url.startsWith('https://')))
          .map((m: any) => ({
            ownerId: new Types.ObjectId(userId),
            subjectId: unit.subjectId,
            unitId: unit._id,
            topicId: createdTopic._id,
            type: 'URL' as const,
            title: m.title || 'Reference Link',
            description: '',
            url: m.url
          }));

        if (materialDocs.length > 0) {
          await Material.insertMany(materialDocs);
        }
      }

      createdTopics.push(createdTopic);
    }

    res.status(200).json({
      success: true,
      message: `Successfully merged ${createdTopics.length} topics into unit "${unit.name}".`,
      count: createdTopics.length,
      unitId: unit._id
    });
  } catch (err: any) {
    console.error('mergeUnitTopics failed:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to merge topics into unit: ' + (err.message || 'Server error')
    });
  }
};

export const smartAISearch = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  const { query, subjectId } = req.body;

  if (!query || typeof query !== 'string' || !query.trim()) {
    res.status(400).json({ success: false, message: 'Search query is required' });
    return;
  }

  // Rate limit
  const rateLimitStatus = checkUserRateLimit(userId || '');
  if (!rateLimitStatus.allowed) {
    res.status(429).json({
      success: false,
      message: `AI request limit reached. Please wait ${rateLimitStatus.resetInSec}s.`,
      resetInSeconds: rateLimitStatus.resetInSec
    });
    return;
  }

  try {
    const topicFilter: any = { ownerId: userId };
    if (subjectId && Types.ObjectId.isValid(subjectId)) {
      topicFilter.subjectId = subjectId;
    }

    // Retrieve topics, notes, subjects for search
    const [topics, subjects, notes] = await Promise.all([
      Topic.find(topicFilter).populate('subjectId', 'name color').populate('unitId', 'name').limit(40),
      Subject.find({ ownerId: userId }).limit(10),
      Note.find({ ownerId: userId }).populate('subjectId', 'name color').populate('topicId', 'title').limit(20)
    ]);

    const items: any[] = [];

    topics.forEach((t: any) => {
      items.push({
        id: t._id.toString(),
        type: 'topic' as const,
        title: t.title,
        description: t.description || '',
        subjectName: t.subjectId?.name || '',
        unitName: t.unitId?.name || '',
        completed: t.completed
      });
    });

    subjects.forEach((s: any) => {
      items.push({
        id: s._id.toString(),
        type: 'subject' as const,
        title: s.name,
        description: s.description || '',
        subjectName: s.name
      });
    });

    notes.forEach((n: any) => {
      items.push({
        id: n._id.toString(),
        type: 'note' as const,
        title: `Note: ${n.topicId?.title || 'Topic Note'}`,
        description: n.content?.slice(0, 200) || '',
        subjectName: n.subjectId?.name || ''
      });
    });

    const aiResult = await smartSearchWithGroq({
      query: query.trim(),
      items
    });

    // Map relevant item IDs back to full topic and note objects
    const matchedTopics = topics.filter((t) => aiResult.relevantItemIds.includes(t._id.toString()));
    const matchedSubjects = subjects.filter((s) => aiResult.relevantItemIds.includes(s._id.toString()));
    const matchedNotes = notes.filter((n) => aiResult.relevantItemIds.includes(n._id.toString()));

    res.status(200).json({
      success: true,
      aiSummary: aiResult.aiSummary,
      suggestedAction: aiResult.suggestedAction,
      topics: matchedTopics.length > 0 ? matchedTopics : topics.slice(0, 10),
      subjects: matchedSubjects,
      notes: matchedNotes,
      units: []
    });
  } catch (err: any) {
    console.error('smartAISearch failed:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Smart search failed'
    });
  }
};
