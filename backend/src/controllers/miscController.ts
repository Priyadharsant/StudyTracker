import { Response } from 'express';
import { Types } from 'mongoose';
import { Subject } from '../models/Subject';
import { Unit } from '../models/Unit';
import { Topic } from '../models/Topic';
import { Material } from '../models/Material';
import { Note } from '../models/Note';
import { AuthenticatedRequest } from '../types';
import { reorderSchema } from '../validators';

export const getDashboardStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;

  const totalSubjects = await Subject.countDocuments({ ownerId: userId });
  const totalUnits = await Unit.countDocuments({ ownerId: userId });
  const totalTopics = await Topic.countDocuments({ ownerId: userId });
  const completedTopics = await Topic.countDocuments({ ownerId: userId, completed: true });
  const remainingTopics = totalTopics - completedTopics;
  const overallPercentage = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  const subjects = await Subject.find({ ownerId: userId }).sort({ updatedAt: -1 });
  const subjectIds = subjects.map(s => s._id);

  const allTopics = await Topic.find({ ownerId: userId, subjectId: { $in: subjectIds } });
  const subjectStats: Record<string, { total: number; completed: number }> = {};
  for (const s of subjects) {
    subjectStats[s._id.toString()] = { total: 0, completed: 0 };
  }
  for (const t of allTopics) {
    const sid = t.subjectId.toString();
    if (subjectStats[sid]) {
      subjectStats[sid].total += 1;
      if (t.completed) subjectStats[sid].completed += 1;
    }
  }

  const subjectCards = subjects.map(s => {
    const stats = subjectStats[s._id.toString()] || { total: 0, completed: 0 };
    return {
      _id: s._id,
      name: s.name,
      description: s.description,
      color: s.color,
      icon: s.icon,
      totalTopics: stats.total,
      completedTopics: stats.completed,
      progressPercentage: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
      updatedAt: s.updatedAt
    };
  });

  const recentlyUpdatedSubjects = subjectCards.slice(0, 5);

  const recentlyStudiedTopics = await Topic.find({ ownerId: userId })
    .populate('subjectId', 'name color')
    .populate('unitId', 'name')
    .sort({ updatedAt: -1 })
    .limit(5);

  const recentlyUpdatedNotes = await Note.find({ ownerId: userId, content: { $ne: '' } })
    .populate('subjectId', 'name color')
    .populate('topicId', 'title')
    .sort({ updatedAt: -1 })
    .limit(5);

  res.status(200).json({
    success: true,
    stats: {
      totalSubjects,
      totalUnits,
      totalTopics,
      completedTopics,
      remainingTopics,
      overallPercentage
    },
    subjectCards,
    recentlyUpdatedSubjects,
    recentlyStudiedTopics,
    recentlyUpdatedNotes
  });
};

export const searchAll = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  const q = (req.query.q as string || '').trim();
  const subjectId = req.query.subjectId as string;
  const unitId = req.query.unitId as string;
  const status = req.query.status as string;

  if (!q && !status && !subjectId && !unitId) {
    res.status(200).json({
      success: true,
      subjects: [],
      units: [],
      topics: [],
      notes: [],
      materials: []
    });
    return;
  }

  const regex = q ? new RegExp(q, 'i') : null;

  const topicFilter: any = { ownerId: userId };
  if (regex) {
    topicFilter.$or = [{ title: regex }, { description: regex }];
  }
  if (subjectId && Types.ObjectId.isValid(subjectId)) {
    topicFilter.subjectId = subjectId;
  }
  if (unitId && Types.ObjectId.isValid(unitId)) {
    topicFilter.unitId = unitId;
  }
  if (status === 'completed') {
    topicFilter.completed = true;
  } else if (status === 'pending') {
    topicFilter.completed = false;
  }

  const topics = await Topic.find(topicFilter)
    .populate('subjectId', 'name color')
    .populate('unitId', 'name')
    .sort({ updatedAt: -1 })
    .limit(30);

  let subjects: any[] = [];
  if (regex && (!status || status === 'all')) {
    subjects = await Subject.find({
      ownerId: userId,
      $or: [{ name: regex }, { description: regex }]
    }).limit(10);
  }

  let units: any[] = [];
  if (regex && (!status || status === 'all')) {
    const unitFilter: any = {
      ownerId: userId,
      $or: [{ name: regex }, { description: regex }]
    };
    if (subjectId && Types.ObjectId.isValid(subjectId)) {
      unitFilter.subjectId = subjectId;
    }
    units = await Unit.find(unitFilter).populate('subjectId', 'name color').limit(15);
  }

  let notes: any[] = [];
  if (regex) {
    const noteFilter: any = {
      ownerId: userId,
      content: regex
    };
    if (subjectId && Types.ObjectId.isValid(subjectId)) {
      noteFilter.subjectId = subjectId;
    }
    notes = await Note.find(noteFilter)
      .populate('subjectId', 'name color')
      .populate('topicId', 'title')
      .limit(15);
  }

  let materials: any[] = [];
  if (regex) {
    const matFilter: any = {
      ownerId: userId,
      $or: [{ title: regex }, { description: regex }, { originalFileName: regex }]
    };
    if (subjectId && Types.ObjectId.isValid(subjectId)) {
      matFilter.subjectId = subjectId;
    }
    materials = await Material.find(matFilter)
      .populate('subjectId', 'name color')
      .populate('topicId', 'title')
      .limit(15);
  }

  res.status(200).json({
    success: true,
    subjects,
    units,
    topics,
    notes,
    materials
  });
};

export const reorderItems = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  const parseResult = reorderSchema.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({ success: false, errors: parseResult.error.format() });
    return;
  }

  const { type, items } = parseResult.data;

  const bulkOps = items.map(item => {
    const updateDoc: any = { order: item.order };
    if (item.unitId && Types.ObjectId.isValid(item.unitId)) {
      updateDoc.unitId = new Types.ObjectId(item.unitId);
    }
    return {
      updateOne: {
        filter: { _id: new Types.ObjectId(item.id), ownerId: new Types.ObjectId(userId) },
        update: { $set: updateDoc }
      }
    };
  });

  if (type === 'subject') {
    await Subject.bulkWrite(bulkOps);
  } else if (type === 'unit') {
    await Unit.bulkWrite(bulkOps);
  } else if (type === 'topic') {
    await Topic.bulkWrite(bulkOps);
  }

  res.status(200).json({ success: true, message: 'Reorder saved successfully' });
};

export const resetTopicProgress = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  const id = req.params.id as string;

  if (!Types.ObjectId.isValid(id)) {
    res.status(400).json({ success: false, message: 'Invalid topic ID' });
    return;
  }

  const topic = await Topic.findOneAndUpdate(
    { _id: id, ownerId: userId },
    { $set: { completed: false } },
    { new: true }
  );

  if (!topic) {
    res.status(404).json({ success: false, message: 'Topic not found' });
    return;
  }

  res.status(200).json({ success: true, topic, message: 'Topic progress reset successfully' });
};

export const resetUnitProgress = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

  await Topic.updateMany({ unitId: unit._id, ownerId: userId }, { $set: { completed: false } });

  res.status(200).json({ success: true, message: 'Unit progress reset successfully' });
};

export const resetSubjectProgress = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

  await Topic.updateMany({ subjectId: subject._id, ownerId: userId }, { $set: { completed: false } });

  res.status(200).json({ success: true, message: 'Subject progress reset successfully' });
};

export const resetAllProgress = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;

  await Topic.updateMany({ ownerId: userId }, { $set: { completed: false } });

  res.status(200).json({ success: true, message: 'All checklist progress reset successfully' });
};
