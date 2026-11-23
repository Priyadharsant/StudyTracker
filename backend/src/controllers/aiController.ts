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
  smartSearchWithGroq,
  generateNotesWithGroq,
  chatAboutTopicWithGroq
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
      message: `Too many requests. Please wait a moment and try again in ${rateLimitStatus.resetInSec} seconds.`,
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

/**
 * Insert multiple AI-generated units (e.g. from pasted multi-unit syllabus)
 * directly into an existing subject!
 */
export const insertUnitsIntoSubject = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  const { subjectId, units } = req.body;

  if (!subjectId || !Types.ObjectId.isValid(subjectId)) {
    res.status(400).json({ success: false, message: 'Valid subjectId is required' });
    return;
  }

  if (!Array.isArray(units) || units.length === 0) {
    res.status(400).json({ success: false, message: 'At least one unit is required' });
    return;
  }

  const subject = await Subject.findOne({ _id: subjectId, ownerId: userId });
  if (!subject) {
    res.status(404).json({ success: false, message: 'Subject not found or access denied' });
    return;
  }

  try {
    const maxOrderDoc = await Unit.findOne({ subjectId: subject._id, ownerId: userId }).sort({ order: -1 }).select('order');
    let nextUnitOrder = maxOrderDoc ? maxOrderDoc.order + 1 : 0;

    let totalCreatedTopics = 0;
    const createdUnitsList = [];

    for (let uIdx = 0; uIdx < units.length; uIdx++) {
      const u = units[uIdx];
      if (!u.name || !Array.isArray(u.topics)) continue;

      const createdUnit = await Unit.create({
        ownerId: new Types.ObjectId(userId),
        subjectId: subject._id,
        name: u.name,
        description: '',
        order: nextUnitOrder++
      });

      for (let tIdx = 0; tIdx < u.topics.length; tIdx++) {
        const t = u.topics[tIdx];
        if (!t.title) continue;

        const createdTopic = await Topic.create({
          ownerId: new Types.ObjectId(userId),
          subjectId: subject._id,
          unitId: createdUnit._id,
          title: t.title.trim(),
          description: t.description || '',
          completed: false,
          priority: 'medium',
          order: tIdx
        });

        if (Array.isArray(t.materials) && t.materials.length > 0) {
          const materialDocs = t.materials
            .filter((m: any) => m.url && typeof m.url === 'string' && (m.url.startsWith('http://') || m.url.startsWith('https://')))
            .map((m: any) => ({
              ownerId: new Types.ObjectId(userId),
              subjectId: subject._id,
              unitId: createdUnit._id,
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
        totalCreatedTopics++;
      }
      createdUnitsList.push(createdUnit);
    }

    res.status(200).json({
      success: true,
      message: `Successfully added ${createdUnitsList.length} units and ${totalCreatedTopics} topics to "${subject.name}".`,
      unitsCount: createdUnitsList.length,
      topicsCount: totalCreatedTopics,
      subjectId: subject._id
    });
  } catch (err: any) {
    console.error('insertUnitsIntoSubject failed:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to insert units into subject: ' + (err.message || 'Server error')
    });
  }
};

export const generateAINotes = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  const rateLimitStatus = checkUserRateLimit(userId);
  if (!rateLimitStatus.allowed) {
    res.status(429).json({
      success: false,
      message: `Too many requests. Please wait a moment and try again.`,
      resetInSeconds: rateLimitStatus.resetInSec
    });
    return;
  }

  const { topicTitle, preset, specification, sourceText } = req.body;

  if (!topicTitle || typeof topicTitle !== 'string' || !topicTitle.trim()) {
    res.status(400).json({
      success: false,
      message: 'Topic title is required.'
    });
    return;
  }

  const validPresets = ['16-mark', '8-mark', '2-mark', 'custom'];
  const selectedPreset = validPresets.includes(preset) ? preset : '16-mark';

  try {
    const result = await generateNotesWithGroq({
      topicTitle: topicTitle.trim(),
      preset: selectedPreset,
      specification: typeof specification === 'string' ? specification.trim() : undefined,
      sourceText: typeof sourceText === 'string' ? sourceText.trim() : undefined
    });

    res.json({
      success: true,
      htmlContent: result.htmlContent,
      summary: result.summary
    });
  } catch (error: any) {
    console.error('[AI Notes Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate revision notes.'
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
      message: `Too many requests. Please wait a moment and try again.`,
      resetInSeconds: rateLimitStatus.resetInSec
    });
    return;
  }

  try {
    const topicFilter: any = { ownerId: userId };
    if (subjectId && Types.ObjectId.isValid(subjectId)) {
      topicFilter.subjectId = subjectId;
    }

    // Extract meaningful search tokens (ignoring conversational filler words like 'i', 'want', 'only', 'subtitles', 'about', etc.)
    const stopWords = new Set(['i', 'me', 'my', 'we', 'our', 'want', 'need', 'give', 'tell', 'show', 'find', 'search', 'for', 'about', 'only', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'from', 'is', 'are', 'was', 'were', 'and', 'or', 'of', 'with', 'what', 'how', 'why', 'can', 'you', 'please', 'notes', 'subtitles', 'subtopics', 'topics', 'unit', 'units', 'chapter', 'chapters', 'all']);
    const cleanTokens = query
      .trim()
      .split(/s+/)
      .map(t => t.replace(/[^a-zA-Z0-9]/g, '').toLowerCase())
      .filter(t => t.length > 1 && !stopWords.has(t));

    let regexQuery: any = null;
    if (cleanTokens.length > 0) {
      regexQuery = new RegExp(cleanTokens.join('|'), 'i');
    } else if (query.trim().length > 1) {
      regexQuery = new RegExp(query.trim().replace(/[^a-zA-Z0-9]/g, '.*'), 'i');
    }

    // Prioritize topics that match query tokens, then general recent topics
    let topicQueryFilter: any = { ...topicFilter };
    if (regexQuery) {
      topicQueryFilter['$or'] = [{ title: regexQuery }, { description: regexQuery }];
    }

    // Retrieve matching topics, plus fallback recent topics, subjects, notes
    const [matchedQueryTopics, fallbackTopics, subjects, notes] = await Promise.all([
      regexQuery ? Topic.find(topicQueryFilter).populate('subjectId', 'name color').populate('unitId', 'name').limit(40) : Promise.resolve([]),
      Topic.find(topicFilter).populate('subjectId', 'name color').populate('unitId', 'name').sort({ updatedAt: -1 }).limit(30),
      Subject.find({ ownerId: userId }).limit(15),
      Note.find({ ownerId: userId }).populate('subjectId', 'name color').populate('topicId', 'title').limit(25)
    ]);

    // Deduplicate topics, putting direct query matches first
    const topicMap = new Map<string, any>();
    matchedQueryTopics.forEach((t: any) => topicMap.set(t._id.toString(), t));
    fallbackTopics.forEach((t: any) => {
      if (!topicMap.has(t._id.toString())) topicMap.set(t._id.toString(), t);
    });
    const topics = Array.from(topicMap.values()).slice(0, 40);

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
      // Strip HTML tags for clean AI search context, providing up to 1,200 chars of substantive note content
      const plainNote = (n.content || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      items.push({
        id: n._id.toString(),
        type: 'note' as const,
        title: `Note: ${n.topicId?.title || 'Topic Note'}`,
        description: plainNote.slice(0, 1200) || '',
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
      keyPoints: aiResult.keyPoints || [],
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

export const chatAboutTopic = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  const { topicId, subjectId, messages } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ success: false, message: 'Messages array is required' });
    return;
  }

  const rateLimitStatus = checkUserRateLimit(userId || '');
  if (!rateLimitStatus.allowed) {
    res.status(429).json({
      success: false,
      message: `Too many requests. Please wait a moment and try again.`,
      resetInSeconds: rateLimitStatus.resetInSec
    });
    return;
  }

  try {
    let topicTitle: string | undefined;
    let topicDescription: string | undefined;
    let subjectName: string | undefined;
    let unitName: string | undefined;
    let notesContent: string | undefined;
    let materialsList: string[] = [];
    let syllabusOverview: string | undefined;

    // 1. Topic-scoped doubt
    if (topicId && Types.ObjectId.isValid(topicId)) {
      const topic = await Topic.findOne({ _id: topicId, ownerId: userId })
        .populate('subjectId', 'name color')
        .populate('unitId', 'name');

      if (topic) {
        topicTitle = topic.title;
        topicDescription = topic.description;
        subjectName = (topic.subjectId as any)?.name || '';
        unitName = (topic.unitId as any)?.name || '';

        const [note, materials] = await Promise.all([
          Note.findOne({ topicId: topic._id, ownerId: userId }),
          Material.find({ topicId: topic._id, ownerId: userId }).select('title type url')
        ]);
        if (note?.content) notesContent = note.content;
        materialsList = materials.map((m) => `${m.title} (${m.type})`);
      }
    }

    // 2. Subject-scoped doubt
    if (!topicTitle && subjectId && Types.ObjectId.isValid(subjectId)) {
      const [subject, units, recentNotes] = await Promise.all([
        Subject.findOne({ _id: subjectId, ownerId: userId }),
        Unit.find({ subjectId, ownerId: userId }).sort({ order: 1 }),
        Note.find({ subjectId, ownerId: userId }).populate('topicId', 'title').limit(5)
      ]);

      if (subject) {
        subjectName = subject.name;
        syllabusOverview = units.map(u => u.name).join('; ');
        if (recentNotes.length > 0) {
          notesContent = recentNotes.map(n => `${(n.topicId as any)?.title || 'Note'}: ${n.content?.slice(0, 300) || ''}`).join('\n');
        }
      }
    }

    const aiReply = await chatAboutTopicWithGroq({
      topicTitle,
      topicDescription,
      subjectName,
      unitName,
      notesContent,
      materialsList,
      syllabusOverview,
      messages
    });

    res.status(200).json({
      success: true,
      reply: aiReply
    });
  } catch (err: any) {
    console.error('chatAboutTopic failed:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'AI tutor chat failed'
    });
  }
};
