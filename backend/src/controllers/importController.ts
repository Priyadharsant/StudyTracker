import { Response } from 'express';
import { Types } from 'mongoose';
import { Subject } from '../models/Subject';
import { Unit } from '../models/Unit';
import { Topic } from '../models/Topic';
import { Material } from '../models/Material';
import { AuthenticatedRequest } from '../types';
import { fullSubjectImportSchema, singleUnitImportSchema } from '../validators/importValidators';

export const validateImportJson = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const body = req.body;

  if (!body || typeof body !== 'object') {
    res.status(400).json({
      success: false,
      valid: false,
      message: 'Invalid payload: JSON object expected'
    });
    return;
  }

  if (body.type === 'subject') {
    const parse = fullSubjectImportSchema.safeParse(body);
    if (!parse.success) {
      const formattedErrors = parse.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message
      }));
      res.status(400).json({
        success: false,
        valid: false,
        errors: formattedErrors,
        message: 'Subject template validation failed'
      });
      return;
    }

    // Summary calculation
    const totalUnits = parse.data.units.length;
    const totalTopics = parse.data.units.reduce((acc, u) => acc + u.topics.length, 0);
    const totalMaterials = parse.data.units.reduce(
      (acc, u) => acc + u.topics.reduce((mAcc, t) => mAcc + (t.materials?.length || 0), 0),
      0
    );

    res.status(200).json({
      success: true,
      valid: true,
      type: 'subject',
      summary: {
        name: parse.data.subject.name,
        description: parse.data.subject.description,
        color: parse.data.subject.color,
        icon: parse.data.subject.icon,
        totalUnits,
        totalTopics,
        totalMaterials,
        units: parse.data.units.map((u) => ({
          name: u.name,
          topicCount: u.topics.length,
          topics: u.topics.map((t) => ({
            title: t.title,
            materialCount: t.materials?.length || 0
          }))
        }))
      }
    });
    return;
  }

  if (body.type === 'unit') {
    const parse = singleUnitImportSchema.safeParse(body);
    if (!parse.success) {
      const formattedErrors = parse.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message
      }));
      res.status(400).json({
        success: false,
        valid: false,
        errors: formattedErrors,
        message: 'Unit template validation failed'
      });
      return;
    }

    const totalTopics = parse.data.unit.topics.length;
    const totalMaterials = parse.data.unit.topics.reduce(
      (acc, t) => acc + (t.materials?.length || 0),
      0
    );

    res.status(200).json({
      success: true,
      valid: true,
      type: 'unit',
      summary: {
        name: parse.data.unit.name,
        totalTopics,
        totalMaterials,
        topics: parse.data.unit.topics.map((t) => ({
          title: t.title,
          materialCount: t.materials?.length || 0
        }))
      }
    });
    return;
  }

  res.status(400).json({
    success: false,
    valid: false,
    message: 'Unsupported template type. "type" field must be "subject" or "unit".'
  });
};

export const importSubject = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  const parse = fullSubjectImportSchema.safeParse(req.body);

  if (!parse.success) {
    const formattedErrors = parse.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message
    }));
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors
    });
    return;
  }

  const { subject: subData, units: unitsData } = parse.data;

  // Determine subject order
  const maxOrderDoc = await Subject.findOne({ ownerId: userId }).sort({ order: -1 }).select('order');
  const nextSubOrder = maxOrderDoc ? maxOrderDoc.order + 1 : 0;

  // Create Subject
  let createdSubject: any = null;
  try {
    createdSubject = await Subject.create({
      ownerId: new Types.ObjectId(userId),
      name: subData.name,
      description: subData.description || '',
      color: subData.color || '#3B82F6',
      icon: subData.icon || 'BookOpen',
      order: nextSubOrder
    });

    // Create Units, Topics & Materials
    for (let uIdx = 0; uIdx < unitsData.length; uIdx++) {
      const u = unitsData[uIdx];
      const createdUnit = await Unit.create({
        ownerId: new Types.ObjectId(userId),
        subjectId: createdSubject._id,
        name: u.name,
        description: '',
        order: uIdx
      });

      for (let tIdx = 0; tIdx < u.topics.length; tIdx++) {
        const t = u.topics[tIdx];
        const createdTopic = await Topic.create({
          ownerId: new Types.ObjectId(userId),
          subjectId: createdSubject._id,
          unitId: createdUnit._id,
          title: t.title,
          description: t.description || '',
          completed: false,
          priority: 'medium',
          order: tIdx
        });

        if (t.materials && t.materials.length > 0) {
          const materialDocs = t.materials.map((m) => ({
            ownerId: new Types.ObjectId(userId),
            subjectId: createdSubject._id,
            unitId: createdUnit._id,
            topicId: createdTopic._id,
            type: 'URL' as const,
            title: m.title,
            description: '',
            url: m.url
          }));
          await Material.insertMany(materialDocs);
        }
      }
    }

    res.status(201).json({
      success: true,
      message: 'Subject and full syllabus imported successfully!',
      subject: createdSubject
    });
  } catch (err: any) {
    console.error('Import Subject failed:', err);
    // Cleanup if partial
    if (createdSubject) {
      await Material.deleteMany({ subjectId: createdSubject._id, ownerId: userId });
      await Topic.deleteMany({ subjectId: createdSubject._id, ownerId: userId });
      await Unit.deleteMany({ subjectId: createdSubject._id, ownerId: userId });
      await Subject.deleteOne({ _id: createdSubject._id, ownerId: userId });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to import subject checklist: ' + (err.message || 'Server error')
    });
  }
};

export const importUnit = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  const { destinationSubjectId, unit: unitPayload, type } = req.body;

  if (!destinationSubjectId || !Types.ObjectId.isValid(destinationSubjectId)) {
    res.status(400).json({ success: false, message: 'Valid destinationSubjectId is required' });
    return;
  }

  // Verify ownership of destination subject
  const subject = await Subject.findOne({ _id: destinationSubjectId, ownerId: userId });
  if (!subject) {
    res.status(404).json({ success: false, message: 'Destination subject not found or access denied' });
    return;
  }

  const parse = singleUnitImportSchema.safeParse({ type, unit: unitPayload });
  if (!parse.success) {
    const formattedErrors = parse.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message
    }));
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors
    });
    return;
  }

  const { unit: uData } = parse.data;

  // Determine next unit order
  const maxOrderDoc = await Unit.findOne({ subjectId: subject._id, ownerId: userId }).sort({ order: -1 }).select('order');
  const nextUnitOrder = maxOrderDoc ? maxOrderDoc.order + 1 : 0;

  let createdUnit: any = null;
  try {
    createdUnit = await Unit.create({
      ownerId: new Types.ObjectId(userId),
      subjectId: subject._id,
      name: uData.name,
      description: '',
      order: nextUnitOrder
    });

    for (let tIdx = 0; tIdx < uData.topics.length; tIdx++) {
      const t = uData.topics[tIdx];
      const createdTopic = await Topic.create({
        ownerId: new Types.ObjectId(userId),
        subjectId: subject._id,
        unitId: createdUnit._id,
        title: t.title,
        description: t.description || '',
        completed: false,
        priority: 'medium',
        order: tIdx
      });

      if (t.materials && t.materials.length > 0) {
        const materialDocs = t.materials.map((m) => ({
          ownerId: new Types.ObjectId(userId),
          subjectId: subject._id,
          unitId: createdUnit._id,
          topicId: createdTopic._id,
          type: 'URL' as const,
          title: m.title,
          description: '',
          url: m.url
        }));
        await Material.insertMany(materialDocs);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Unit and topics imported successfully!',
      unit: createdUnit,
      subjectId: subject._id
    });
  } catch (err: any) {
    console.error('Import Unit failed:', err);
    if (createdUnit) {
      await Material.deleteMany({ unitId: createdUnit._id, ownerId: userId });
      await Topic.deleteMany({ unitId: createdUnit._id, ownerId: userId });
      await Unit.deleteOne({ _id: createdUnit._id, ownerId: userId });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to import unit: ' + (err.message || 'Server error')
    });
  }
};
