import { Response } from 'express';
import { Types } from 'mongoose';
import fs from 'fs';
import path from 'path';
import { Topic } from '../models/Topic';
import { Material } from '../models/Material';
import { AuthenticatedRequest } from '../types';
import { createMaterialUrlSchema, updateMaterialSchema } from '../validators';
import {
  uploadFileToStorage,
  deleteFileFromStorage,
  getFileAccessUrl
} from '../services/storageService';

export const getMaterialsByTopic = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

  const materials = await Material.find({ topicId, ownerId: userId }).sort({ createdAt: -1 });
  res.status(200).json({ success: true, materials });
};

export const createUrlMaterial = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

  const parseResult = createMaterialUrlSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ success: false, errors: parseResult.error.format() });
    return;
  }

  const material = await Material.create({
    ownerId: new Types.ObjectId(userId),
    subjectId: topic.subjectId,
    unitId: topic.unitId,
    topicId: topic._id,
    type: 'URL',
    title: parseResult.data.title,
    description: parseResult.data.description,
    url: parseResult.data.url
  });

  res.status(201).json({ success: true, material });
};

export const uploadFileMaterial = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  const { topicId, title, description } = req.body;
  const file = req.file;

  if (!file) {
    res.status(400).json({ success: false, message: 'No document file uploaded' });
    return;
  }

  if (!Types.ObjectId.isValid(topicId as string)) {
    res.status(400).json({ success: false, message: 'Invalid topic ID' });
    return;
  }

  const topic = await Topic.findOne({ _id: topicId, ownerId: userId });
  if (!topic) {
    res.status(404).json({ success: false, message: 'Topic not found' });
    return;
  }

  try {
    const { storagePath, url } = await uploadFileToStorage(file, userId!);

    const materialTitle = title && title.trim().length > 0 ? title.trim() : file.originalname;

    const material = await Material.create({
      ownerId: new Types.ObjectId(userId),
      subjectId: topic.subjectId,
      unitId: topic.unitId,
      topicId: topic._id,
      type: 'FILE',
      title: materialTitle,
      description: description || '',
      url: url,
      storagePath,
      originalFileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size
    });

    res.status(201).json({ success: true, material, message: 'Document uploaded successfully' });
  } catch (error: any) {
    console.error('File upload controller error:', error);
    res.status(500).json({ success: false, message: error.message || 'File upload failed' });
  }
};

export const updateMaterial = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  const id = req.params.id as string;

  if (!Types.ObjectId.isValid(id)) {
    res.status(400).json({ success: false, message: 'Invalid material ID' });
    return;
  }

  const parseResult = updateMaterialSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ success: false, errors: parseResult.error.format() });
    return;
  }

  const material = await Material.findOneAndUpdate(
    { _id: id, ownerId: userId },
    { $set: parseResult.data },
    { new: true }
  );

  if (!material) {
    res.status(404).json({ success: false, message: 'Material not found' });
    return;
  }

  res.status(200).json({ success: true, material });
};

export const deleteMaterial = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  const id = req.params.id as string;

  if (!Types.ObjectId.isValid(id)) {
    res.status(400).json({ success: false, message: 'Invalid material ID' });
    return;
  }

  const material = await Material.findOne({ _id: id, ownerId: userId });
  if (!material) {
    res.status(404).json({ success: false, message: 'Material not found' });
    return;
  }

  if (material.type === 'FILE' && material.storagePath) {
    await deleteFileFromStorage(material.storagePath);
  }

  await Material.deleteOne({ _id: material._id, ownerId: userId });
  res.status(200).json({ success: true, message: 'Material deleted successfully' });
};

export const viewMaterial = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  const id = req.params.id as string;

  if (!Types.ObjectId.isValid(id)) {
    res.status(400).json({ success: false, message: 'Invalid material ID' });
    return;
  }

  const material = await Material.findOne({ _id: id, ownerId: userId });
  if (!material) {
    res.status(404).json({ success: false, message: 'Material not found' });
    return;
  }

  if (material.type === 'URL') {
    res.status(200).json({ success: true, type: 'URL', url: material.url });
    return;
  }

  if (!material.storagePath) {
    res.status(404).json({ success: false, message: 'File reference missing' });
    return;
  }

  const access = await getFileAccessUrl(material.storagePath);

  if (access.type === 'local' && access.localPath) {
    if (!fs.existsSync(access.localPath)) {
      res.status(404).json({ success: false, message: 'File not found on server' });
      return;
    }
    res.setHeader('Content-Type', material.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(material.originalFileName || 'document')}"`);
    fs.createReadStream(access.localPath).pipe(res);
    return;
  }

  if (access.url) {
    res.status(200).json({
      success: true,
      type: 'FILE',
      signedUrl: access.url,
      mimeType: material.mimeType,
      fileName: material.originalFileName
    });
    return;
  }

  res.status(500).json({ success: false, message: 'Unable to generate access URL' });
};

export const downloadMaterial = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  const id = req.params.id as string;

  if (!Types.ObjectId.isValid(id)) {
    res.status(400).json({ success: false, message: 'Invalid material ID' });
    return;
  }

  const material = await Material.findOne({ _id: id, ownerId: userId });
  if (!material) {
    res.status(404).json({ success: false, message: 'Material not found' });
    return;
  }

  if (material.type === 'URL') {
    res.redirect(material.url || '');
    return;
  }

  if (!material.storagePath) {
    res.status(404).json({ success: false, message: 'File reference missing' });
    return;
  }

  const access = await getFileAccessUrl(material.storagePath);

  if (access.type === 'local' && access.localPath) {
    if (!fs.existsSync(access.localPath)) {
      res.status(404).json({ success: false, message: 'File not found on disk' });
      return;
    }
    res.download(access.localPath, material.originalFileName || 'download');
    return;
  }

  if (access.url) {
    res.redirect(access.url);
    return;
  }

  res.status(500).json({ success: false, message: 'Unable to download file' });
};

export const streamLocalFile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  const fileUserId = req.params.fileUserId as string;
  const filename = req.params.filename as string;

  if (userId !== fileUserId) {
    res.status(403).json({ success: false, message: 'Forbidden' });
    return;
  }

  const safeFilename = path.basename(filename);
  const filePath = path.join(__dirname, '../../uploads', fileUserId, safeFilename);

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ success: false, message: 'File not found' });
    return;
  }

  res.sendFile(filePath);
};
