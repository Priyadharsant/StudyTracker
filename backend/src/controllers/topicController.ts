import { Response } from 'express';
import { Types } from 'mongoose';
import { Unit } from '../models/Unit';
import { Topic } from '../models/Topic';
import { Material } from '../models/Material';
import { Note } from '../models/Note';
import { AuthenticatedRequest } from '../types';
import { createTopicSchema, updateTopicSchema } from '../validators';
import { deleteFileFromStorage } from '../services/storageService';

export const getTopicsByUnit = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  const unitId = req.params.id as string;

  if (!Types.ObjectId.isValid(unitId)) {
    res.status(400).json({ success: false, message: 'Invalid unit ID' });
    return;
  }

  const unit = await Unit.findOne({ _id: unitId, ownerId: userId });
  if (!unit) {
    res.status(404).json({ success: false, message: 'Unit not found' });
    return;
  }

  const topics = await Topic.find({ unitId, ownerId: userId }).sort({ order: 1, createdAt: 1 });
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

  const result = topics.map(t => ({
    ...t.toObject(),
    materialCount: materialMap[t._id.toString()] || 0,
    hasNotes: !!noteMap[t._id.toString()]
  }));

  res.status(200).json({ success: true, topics: result });
};

export const createTopic = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  const unitId = req.params.id as string;

  if (!Types.ObjectId.isValid(unitId)) {
    res.status(400).json({ success: false, message: 'Invalid unit ID' });
    return;
  }

  const unit = await Unit.findOne({ _id: unitId, ownerId: userId });
  if (!unit) {
    res.status(404).json({ success: false, message: 'Unit not found' });
    return;
  }

  const parseResult = createTopicSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ success: false, errors: parseResult.error.format() });
    return;
  }

  const maxOrderDoc = await Topic.findOne({ unitId: new Types.ObjectId(unitId), ownerId: userId }).sort({ order: -1 }).select('order');
  const nextOrder = maxOrderDoc ? maxOrderDoc.order + 1 : 0;

  const topic = await Topic.create({
    ownerId: new Types.ObjectId(userId),
    subjectId: unit.subjectId,
    unitId: unit._id,
    title: parseResult.data.title,
    description: parseResult.data.description,
    priority: parseResult.data.priority,
    deadline: parseResult.data.deadline ? new Date(parseResult.data.deadline) : null,
    completed: false,
    order: nextOrder
  });

  let materialCount = 0;
  if (parseResult.data.materialUrl && parseResult.data.materialUrl.trim().length > 0) {
    const matTitle = parseResult.data.materialTitle && parseResult.data.materialTitle.trim().length > 0
      ? parseResult.data.materialTitle.trim()
      : 'Study Material';

    await Material.create({
      ownerId: new Types.ObjectId(userId),
      subjectId: unit.subjectId,
      unitId: unit._id,
      topicId: topic._id,
      type: 'URL',
      title: matTitle,
      description: '',
      url: parseResult.data.materialUrl.trim()
    });
    materialCount = 1;
  }

  res.status(201).json({
    success: true,
    topic: {
      ...topic.toObject(),
      materialCount,
      hasNotes: false
    }
  });
};

export const updateTopic = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  const id = req.params.id as string;

  if (!Types.ObjectId.isValid(id)) {
    res.status(400).json({ success: false, message: 'Invalid topic ID' });
    return;
  }

  const parseResult = updateTopicSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ success: false, errors: parseResult.error.format() });
    return;
  }

  const updateData: any = { ...parseResult.data };
  if (updateData.deadline !== undefined) {
    updateData.deadline = updateData.deadline ? new Date(updateData.deadline) : null;
  }

  const topic = await Topic.findOneAndUpdate(
    { _id: id, ownerId: userId },
    { $set: updateData },
    { new: true }
  );

  if (!topic) {
    res.status(404).json({ success: false, message: 'Topic not found' });
    return;
  }

  res.status(200).json({ success: true, topic });
};

export const updateTopicProgress = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  const id = req.params.id as string;
  const { completed } = req.body;

  if (!Types.ObjectId.isValid(id)) {
    res.status(400).json({ success: false, message: 'Invalid topic ID' });
    return;
  }

  if (typeof completed !== 'boolean') {
    res.status(400).json({ success: false, message: 'completed must be a boolean' });
    return;
  }

  const topic = await Topic.findOneAndUpdate(
    { _id: id, ownerId: userId },
    { $set: { completed } },
    { new: true }
  );

  if (!topic) {
    res.status(404).json({ success: false, message: 'Topic not found' });
    return;
  }

  res.status(200).json({ success: true, topic });
};

export const moveTopic = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  const id = req.params.id as string;
  const { targetUnitId } = req.body;

  if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(targetUnitId)) {
    res.status(400).json({ success: false, message: 'Invalid topic or target unit ID' });
    return;
  }

  const targetUnit = await Unit.findOne({ _id: targetUnitId, ownerId: userId });
  if (!targetUnit) {
    res.status(404).json({ success: false, message: 'Target unit not found' });
    return;
  }

  const topic = await Topic.findOne({ _id: id, ownerId: userId });
  if (!topic) {
    res.status(404).json({ success: false, message: 'Topic not found' });
    return;
  }

  const maxOrderDoc = await Topic.findOne({ unitId: targetUnit._id, ownerId: userId }).sort({ order: -1 }).select('order');
  const nextOrder = maxOrderDoc ? maxOrderDoc.order + 1 : 0;

  topic.unitId = targetUnit._id as Types.ObjectId;
  topic.subjectId = targetUnit.subjectId as Types.ObjectId;
  topic.order = nextOrder;
  await topic.save();

  await Material.updateMany({ topicId: topic._id }, { $set: { unitId: targetUnit._id, subjectId: targetUnit.subjectId } });
  await Note.updateMany({ topicId: topic._id }, { $set: { unitId: targetUnit._id, subjectId: targetUnit.subjectId } });

  res.status(200).json({ success: true, topic, message: 'Topic moved successfully' });
};

export const deleteTopic = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  const id = req.params.id as string;

  if (!Types.ObjectId.isValid(id)) {
    res.status(400).json({ success: false, message: 'Invalid topic ID' });
    return;
  }

  const topic = await Topic.findOne({ _id: id, ownerId: userId });
  if (!topic) {
    res.status(404).json({ success: false, message: 'Topic not found' });
    return;
  }

  const fileMaterials = await Material.find({ topicId: topic._id, ownerId: userId, type: 'FILE' });
  for (const m of fileMaterials) {
    if (m.storagePath) {
      await deleteFileFromStorage(m.storagePath).catch(err => console.error('Topic delete file error:', err));
    }
  }

  await Material.deleteMany({ topicId: topic._id, ownerId: userId });
  await Note.deleteMany({ topicId: topic._id, ownerId: userId });
  await Topic.deleteOne({ _id: topic._id, ownerId: userId });

  res.status(200).json({ success: true, message: 'Topic and associated data deleted successfully' });
};
