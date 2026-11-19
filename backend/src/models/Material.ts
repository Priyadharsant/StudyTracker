import { Schema, model, Document, Types } from 'mongoose';

export interface IMaterial extends Document {
  ownerId: Types.ObjectId;
  subjectId: Types.ObjectId;
  unitId: Types.ObjectId;
  topicId?: Types.ObjectId;
  type: 'URL' | 'FILE';
  title: string;
  description?: string;
  url?: string;
  storagePath?: string;
  originalFileName?: string;
  mimeType?: string;
  fileSize?: number;
  createdAt: Date;
  updatedAt: Date;
}

const MaterialSchema = new Schema<IMaterial>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    unitId: { type: Schema.Types.ObjectId, ref: 'Unit', required: true, index: true },
    topicId: { type: Schema.Types.ObjectId, ref: 'Topic', required: false, index: true },
    type: { type: String, enum: ['URL', 'FILE'], required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    url: { type: String, default: '' },
    storagePath: { type: String, default: '' },
    originalFileName: { type: String, default: '' },
    mimeType: { type: String, default: '' },
    fileSize: { type: Number, default: 0 }
  },
  { timestamps: true }
);

MaterialSchema.index({ unitId: 1, createdAt: 1 });
MaterialSchema.index({ topicId: 1, createdAt: 1 });
MaterialSchema.index({ ownerId: 1, title: 'text', description: 'text' });

export const Material = model<IMaterial>('Material', MaterialSchema);
