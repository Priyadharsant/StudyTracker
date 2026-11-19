import { Response } from 'express';
import { Types } from 'mongoose';
import { Topic } from '../models/Topic';
import { Note } from '../models/Note';
import { AuthenticatedRequest } from '../types';
import { updateNoteSchema } from '../validators';

export const getNotesByTopic = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  const topicId = req.params.id as string;

  if (!Types.ObjectId.isValid(topicId)) {
    res.status(400).json({ success: false, message: 'Invalid topic ID' });
    return;
  }

  const topic = await Topic.findOne({ _id: topicId, ownerId: userId });
  if (!topic) {
    res.status(404).json({ success: false, message: 'Topic not found' });
    return;
  }

  let note = await Note.findOne({ topicId, ownerId: userId });
  if (!note) {
    note = await Note.create({
      ownerId: new Types.ObjectId(userId),
      subjectId: topic.subjectId,
      unitId: topic.unitId,
      topicId: topic._id,
      content: ''
    });
  }

  res.status(200).json({ success: true, note });
};

export const createOrUpdateNote = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  const topicId = req.params.id as string;

  if (!Types.ObjectId.isValid(topicId)) {
    res.status(400).json({ success: false, message: 'Invalid topic ID' });
    return;
  }

  const topic = await Topic.findOne({ _id: topicId, ownerId: userId });
  if (!topic) {
    res.status(404).json({ success: false, message: 'Topic not found' });
    return;
  }

  const parseResult = updateNoteSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ success: false, errors: parseResult.error.format() });
    return;
  }

  const note = await Note.findOneAndUpdate(
    { topicId, ownerId: userId },
    {
      $set: {
        content: parseResult.data.content,
        subjectId: topic.subjectId,
        unitId: topic.unitId
      }
    },
    { new: true, upsert: true }
  );

  res.status(200).json({ success: true, note, message: 'Note saved successfully' });
};

export const updateNoteById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  const id = req.params.id as string;

  if (!Types.ObjectId.isValid(id)) {
    res.status(400).json({ success: false, message: 'Invalid note ID' });
    return;
  }

  const parseResult = updateNoteSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ success: false, errors: parseResult.error.format() });
    return;
  }

  const note = await Note.findOneAndUpdate(
    { _id: id, ownerId: userId },
    { $set: { content: parseResult.data.content } },
    { new: true }
  );

  if (!note) {
    res.status(404).json({ success: false, message: 'Note not found' });
    return;
  }

  res.status(200).json({ success: true, note });
};

export const deleteNote = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  const id = req.params.id as string;

  if (!Types.ObjectId.isValid(id)) {
    res.status(400).json({ success: false, message: 'Invalid note ID' });
    return;
  }

  const note = await Note.findOneAndDelete({ _id: id, ownerId: userId });
  if (!note) {
    res.status(404).json({ success: false, message: 'Note not found' });
    return;
  }

  res.status(200).json({ success: true, message: 'Note deleted successfully' });
};

export const getAllNotes = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  const notes = await Note.find({ ownerId: userId, content: { $ne: '' } })
    .populate('subjectId', 'name color')
    .populate('unitId', 'name')
    .populate('topicId', 'title completed')
    .sort({ updatedAt: -1 });

  res.status(200).json({ success: true, notes });
};
