import { Response } from 'express';
import { Types } from 'mongoose';
import { Subject } from '../models/Subject';
import { Topic } from '../models/Topic';
import { Unit } from '../models/Unit';
import { Material } from '../models/Material';
import { Note } from '../models/Note';
import { AuthenticatedRequest } from '../types';
import { createSubjectSchema, updateSubjectSchema } from '../validators';
import { deleteFileFromStorage } from '../services/storageService';

export const getSubjects = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  const subjects = await Subject.find({ ownerId: userId }).sort({ order: 1, createdAt: 1 });

  const subjectIds = subjects.map(s => s._id);
  const topics = await Topic.find({ ownerId: userId, subjectId: { $in: subjectIds } });

  const statsMap: Record<string, { totalTopics: number; completedTopics: number; topicTitles: string[] }> = {};
  for (const s of subjects) {
    statsMap[s._id.toString()] = { totalTopics: 0, completedTopics: 0, topicTitles: [] };
  }

  for (const t of topics) {
    const sId = t.subjectId.toString();
    if (statsMap[sId]) {
      statsMap[sId].totalTopics += 1;
      if (t.completed) statsMap[sId].completedTopics += 1;
      if (t.title) statsMap[sId].topicTitles.push(t.title);
    }
  }

  const result = subjects.map(sub => ({
    ...sub.toObject(),
    totalTopics: statsMap[sub._id.toString()]?.totalTopics || 0,
    completedTopics: statsMap[sub._id.toString()]?.completedTopics || 0,
    topicTitles: statsMap[sub._id.toString()]?.topicTitles || [],
    progressPercentage:
      (statsMap[sub._id.toString()]?.totalTopics || 0) > 0
        ? Math.round(
            ((statsMap[sub._id.toString()]?.completedTopics || 0) /
              (statsMap[sub._id.toString()]?.totalTopics || 1)) *
              100
          )
        : 0
  }));

  res.status(200).json({ success: true, subjects: result });
};

export const getSubjectById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  const id = req.params.id as string;

  if (!Types.ObjectId.isValid(id)) {
    res.status(400).json({ success: false, message: 'Invalid subject ID' });
    return;
  }

  const subject = await Subject.findOne({ _id: id, ownerId: userId });
  if (!subject) {
    res.status(404).json({ success: false, message: 'Subject not found' });
    return;
  }

  const totalTopics = await Topic.countDocuments({ subjectId: subject._id, ownerId: userId });
  const completedTopics = await Topic.countDocuments({ subjectId: subject._id, ownerId: userId, completed: true });

  res.status(200).json({
    success: true,
    subject: {
      ...subject.toObject(),
      totalTopics,
      completedTopics,
      progressPercentage: totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0
    }
  });
};

export const createSubject = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  const parseResult = createSubjectSchema.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({ success: false, errors: parseResult.error.format() });
    return;
  }

  const maxOrderDoc = await Subject.findOne({ ownerId: userId }).sort({ order: -1 }).select('order');
  const nextOrder = maxOrderDoc ? maxOrderDoc.order + 1 : 0;

  const subject = await Subject.create({
    ownerId: userId,
    ...parseResult.data,
    order: nextOrder
  });

  res.status(201).json({ success: true, subject });
};

export const updateSubject = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  const id = req.params.id as string;

  if (!Types.ObjectId.isValid(id)) {
    res.status(400).json({ success: false, message: 'Invalid subject ID' });
    return;
  }

  const parseResult = updateSubjectSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ success: false, errors: parseResult.error.format() });
    return;
  }

  const subject = await Subject.findOneAndUpdate(
    { _id: id, ownerId: userId },
    { $set: parseResult.data },
    { new: true }
  );

  if (!subject) {
    res.status(404).json({ success: false, message: 'Subject not found' });
    return;
  }

  res.status(200).json({ success: true, subject });
};

export const deleteSubject = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  const id = req.params.id as string;

  if (!Types.ObjectId.isValid(id)) {
    res.status(400).json({ success: false, message: 'Invalid subject ID' });
    return;
  }

  const subject = await Subject.findOne({ _id: id, ownerId: userId });
  if (!subject) {
    res.status(404).json({ success: false, message: 'Subject not found' });
    return;
  }

  const fileMaterials = await Material.find({ subjectId: subject._id, ownerId: userId, type: 'FILE' });
  for (const m of fileMaterials) {
    if (m.storagePath) {
      await deleteFileFromStorage(m.storagePath).catch(err => console.error('Subject delete file error:', err));
    }
  }

  await Material.deleteMany({ subjectId: subject._id, ownerId: userId });
  await Note.deleteMany({ subjectId: subject._id, ownerId: userId });
  await Topic.deleteMany({ subjectId: subject._id, ownerId: userId });
  await Unit.deleteMany({ subjectId: subject._id, ownerId: userId });
  await Subject.deleteOne({ _id: subject._id, ownerId: userId });

  res.status(200).json({ success: true, message: 'Subject and all associated items deleted safely' });
};

export const duplicateSubject = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  const id = req.params.id as string;

  if (!Types.ObjectId.isValid(id)) {
    res.status(400).json({ success: false, message: 'Invalid subject ID' });
    return;
  }

  const origSubject = await Subject.findOne({ _id: id, ownerId: userId });
  if (!origSubject) {
    res.status(404).json({ success: false, message: 'Subject not found' });
    return;
  }

  const maxOrderDoc = await Subject.findOne({ ownerId: userId }).sort({ order: -1 }).select('order');
  const nextOrder = maxOrderDoc ? maxOrderDoc.order + 1 : 0;

  const newSubject = await Subject.create({
    ownerId: userId,
    name: `${origSubject.name} (Copy)`,
    description: origSubject.description,
    color: origSubject.color,
    icon: origSubject.icon,
    order: nextOrder
  });

  const origUnits = await Unit.find({ subjectId: origSubject._id, ownerId: userId }).sort({ order: 1 });
  for (const u of origUnits) {
    const newUnit = await Unit.create({
      ownerId: userId,
      subjectId: newSubject._id,
      name: u.name,
      description: u.description,
      order: u.order
    });

    const origTopics = await Topic.find({ unitId: u._id, ownerId: userId }).sort({ order: 1 });
    for (const t of origTopics) {
      const newTopic = await Topic.create({
        ownerId: userId,
        subjectId: newSubject._id,
        unitId: newUnit._id,
        title: t.title,
        description: t.description,
        completed: false,
        priority: t.priority,
        deadline: t.deadline,
        order: t.order
      });

      const origNotes = await Note.find({ topicId: t._id, ownerId: userId });
      for (const n of origNotes) {
        await Note.create({
          ownerId: userId,
          subjectId: newSubject._id,
          unitId: newUnit._id,
          topicId: newTopic._id,
          content: n.content
        });
      }

      const origMaterials = await Material.find({ topicId: t._id, ownerId: userId });
      for (const m of origMaterials) {
        await Material.create({
          ownerId: userId,
          subjectId: newSubject._id,
          unitId: newUnit._id,
          topicId: newTopic._id,
          type: m.type,
          title: m.title,
          description: m.description,
          url: m.url,
          storagePath: m.storagePath,
          originalFileName: m.originalFileName,
          mimeType: m.mimeType,
          fileSize: m.fileSize
        });
      }
    }
  }

  res.status(201).json({ success: true, subject: newSubject, message: 'Subject duplicated successfully' });
};

// Generate or fetch share code for a subject
export const getOrGenerateShareLink = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  const id = req.params.id as string;

  if (!Types.ObjectId.isValid(id)) {
    res.status(400).json({ success: false, message: 'Invalid subject ID' });
    return;
  }

  const subject = await Subject.findOne({ _id: id, ownerId: userId });
  if (!subject) {
    res.status(404).json({ success: false, message: 'Subject not found' });
    return;
  }

  if (!subject.shareCode) {
    const crypto = await import('crypto');
    subject.shareCode = crypto.randomBytes(6).toString('hex');
    subject.isPublic = true;
    await subject.save();
  }

  res.status(200).json({
    success: true,
    shareCode: subject.shareCode,
    isPublic: subject.isPublic
  });
};

// Toggle public sharing on/off
export const toggleSubjectSharing = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  const id = req.params.id as string;
  const { isPublic } = req.body;

  const subject = await Subject.findOne({ _id: id, ownerId: userId });
  if (!subject) {
    res.status(404).json({ success: false, message: 'Subject not found' });
    return;
  }

  if (!subject.shareCode) {
    const crypto = await import('crypto');
    subject.shareCode = crypto.randomBytes(6).toString('hex');
  }

  subject.isPublic = isPublic !== undefined ? isPublic : !subject.isPublic;
  await subject.save();

  res.status(200).json({
    success: true,
    isPublic: subject.isPublic,
    shareCode: subject.shareCode
  });
};

// Public read-only view of a shared subject by shareCode (No authentication required)
export const getSharedSubject = async (req: any, res: Response): Promise<void> => {
  const code = req.params.code as string;

  if (!code) {
    res.status(400).json({ success: false, message: 'Share code required' });
    return;
  }

  const subject = await Subject.findOne({ shareCode: code, isPublic: true });
  if (!subject) {
    res.status(404).json({ success: false, message: 'Shared subject not found or link has been disabled' });
    return;
  }

  const units = await Unit.find({ subjectId: subject._id }).sort({ order: 1 });
  const unitIds = units.map(u => u._id);

  const topics = await Topic.find({ unitId: { $in: unitIds } }).sort({ order: 1 });
  const topicIds = topics.map(t => t._id);

  const materials = await Material.find({
    $or: [{ topicId: { $in: topicIds } }, { unitId: { $in: unitIds } }]
  });
  const notes = await Note.find({ topicId: { $in: topicIds } });

  const materialsByTopic: Record<string, any[]> = {};
  const materialsByUnit: Record<string, any[]> = {};
  for (const m of materials) {
    if (m.topicId) {
      const tId = m.topicId.toString();
      if (!materialsByTopic[tId]) materialsByTopic[tId] = [];
      materialsByTopic[tId].push(m);
    } else if (m.unitId) {
      const uId = m.unitId.toString();
      if (!materialsByUnit[uId]) materialsByUnit[uId] = [];
      materialsByUnit[uId].push(m);
    }
  }

  const notesByTopic: Record<string, any[]> = {};
  for (const n of notes) {
    const tId = n.topicId.toString();
    if (!notesByTopic[tId]) notesByTopic[tId] = [];
    notesByTopic[tId].push(n);
  }

  const unitsWithTopics = units.map(unit => {
    const unitTopics = topics
      .filter(t => t.unitId.toString() === unit._id.toString())
      .map(topic => {
        const tObj = topic.toObject();
        // NEVER expose the author's checklist completion state for shared subjects
        delete (tObj as any).completed;
        return {
          ...tObj,
          materials: materialsByTopic[topic._id.toString()] || [],
          notes: notesByTopic[topic._id.toString()] || []
        };
      });

    return {
      _id: unit._id,
      name: unit.name,
      description: unit.description,
      order: unit.order,
      topics: unitTopics,
      materials: materialsByUnit[unit._id.toString()] || []
    };
  });

  res.status(200).json({
    success: true,
    subject: {
      _id: subject._id,
      name: subject.name,
      description: subject.description,
      color: subject.color,
      icon: subject.icon,
      shareCode: subject.shareCode
    },
    units: unitsWithTopics
  });
};
