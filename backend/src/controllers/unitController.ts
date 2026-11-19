import { Response } from 'express';
import { Types } from 'mongoose';
import { Subject } from '../models/Subject';
import { Unit } from '../models/Unit';
import { Topic } from '../models/Topic';
import { Material } from '../models/Material';
import { Note } from '../models/Note';
import { AuthenticatedRequest } from '../types';
import { createUnitSchema, updateUnitSchema } from '../validators';
import { deleteFileFromStorage } from '../services/storageService';

export const getUnitsBySubject = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  const subjectId = req.params.id as string;

  if (!Types.ObjectId.isValid(subjectId)) {
    res.status(400).json({ success: false, message: 'Invalid subject ID' });
    return;
  }

  const subject = await Subject.findOne({ _id: subjectId, ownerId: userId });
  if (!subject) {
    res.status(404).json({ success: false, message: 'Subject not found' });
    return;
  }

  const units = await Unit.find({ subjectId, ownerId: userId }).sort({ order: 1, createdAt: 1 });
  const unitIds = units.map(u => u._id);

  const topics = await Topic.find({ unitId: { $in: unitIds }, ownerId: userId }).sort({ order: 1, createdAt: 1 });

  const topicIds = topics.map(t => t._id);
  const materials = await Material.find({ topicId: { $in: topicIds }, ownerId: userId });
  const notes = await Note.find({ topicId: { $in: topicIds }, ownerId: userId });

  const materialMap: Record<string, number> = {};
  for (const m of materials) {
    if (m.topicId) {
      const tid = m.topicId.toString();
      materialMap[tid] = (materialMap[tid] || 0) + 1;
    }
  }

  const noteMap: Record<string, boolean> = {};
  for (const n of notes) {
    if (n.content && n.content.trim().length > 0) {
      noteMap[n.topicId.toString()] = true;
    }
  }

  const topicsByUnit: Record<string, any[]> = {};
  for (const u of units) {
    topicsByUnit[u._id.toString()] = [];
  }

  for (const t of topics) {
    const uid = t.unitId.toString();
    if (topicsByUnit[uid]) {
      topicsByUnit[uid].push({
        ...t.toObject(),
        materialCount: materialMap[t._id.toString()] || 0,
        hasNotes: !!noteMap[t._id.toString()]
      });
    }
  }

  const result = units.map(u => {
    const uTopics = topicsByUnit[u._id.toString()] || [];
    const completedTopics = uTopics.filter((t: any) => t.completed).length;
    const totalTopics = uTopics.length;
    return {
      ...u.toObject(),
      topics: uTopics,
      totalTopics,
      completedTopics,
      progressPercentage: totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0
    };
  });

  res.status(200).json({ success: true, units: result });
};

export const createUnit = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  const subjectId = req.params.id as string;

  if (!Types.ObjectId.isValid(subjectId)) {
    res.status(400).json({ success: false, message: 'Invalid subject ID' });
    return;
  }

  const subject = await Subject.findOne({ _id: subjectId, ownerId: userId });
  if (!subject) {
    res.status(404).json({ success: false, message: 'Subject not found' });
    return;
  }

  const parseResult = createUnitSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ success: false, errors: parseResult.error.format() });
    return;
  }

  const maxOrderDoc = await Unit.findOne({ subjectId: new Types.ObjectId(subjectId), ownerId: userId }).sort({ order: -1 }).select('order');
  const nextOrder = maxOrderDoc ? maxOrderDoc.order + 1 : 0;

  const unit = await Unit.create({
    ownerId: new Types.ObjectId(userId),
    subjectId: new Types.ObjectId(subjectId),
    name: parseResult.data.name,
    description: parseResult.data.description,
    order: nextOrder
  });

  res.status(201).json({
    success: true,
    unit: {
      ...unit.toObject(),
      topics: [],
      totalTopics: 0,
      completedTopics: 0,
      progressPercentage: 0
    }
  });
};

export const updateUnit = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  const id = req.params.id as string;

  if (!Types.ObjectId.isValid(id)) {
    res.status(400).json({ success: false, message: 'Invalid unit ID' });
    return;
  }

  const parseResult = updateUnitSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ success: false, errors: parseResult.error.format() });
    return;
  }

  const unit = await Unit.findOneAndUpdate(
    { _id: id, ownerId: userId },
    { $set: parseResult.data },
    { new: true }
  );

  if (!unit) {
    res.status(404).json({ success: false, message: 'Unit not found' });
    return;
  }

  res.status(200).json({ success: true, unit });
};

export const deleteUnit = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  const id = req.params.id as string;

  if (!Types.ObjectId.isValid(id)) {
    res.status(400).json({ success: false, message: 'Invalid unit ID' });
    return;
  }

  const unit = await Unit.findOne({ _id: id, ownerId: userId });
  if (!unit) {
    res.status(404).json({ success: false, message: 'Unit not found' });
    return;
  }

  const fileMaterials = await Material.find({ unitId: unit._id, ownerId: userId, type: 'FILE' });
  for (const m of fileMaterials) {
    if (m.storagePath) {
      await deleteFileFromStorage(m.storagePath).catch(err => console.error('Unit delete file error:', err));
    }
  }

  await Material.deleteMany({ unitId: unit._id, ownerId: userId });
  await Note.deleteMany({ unitId: unit._id, ownerId: userId });
  await Topic.deleteMany({ unitId: unit._id, ownerId: userId });
  await Unit.deleteOne({ _id: unit._id, ownerId: userId });

  res.status(200).json({ success: true, message: 'Unit and all associated topics deleted successfully' });
};
