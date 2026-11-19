import { Schema, model, Document, Types } from 'mongoose';

export interface ISubject extends Document {
  ownerId: Types.ObjectId;
  name: string;
  description?: string;
  color: string;
  icon: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const SubjectSchema = new Schema<ISubject>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    color: { type: String, default: '#3B82F6' },
    icon: { type: String, default: 'BookOpen' },
    order: { type: Number, default: 0, index: true }
  },
  { timestamps: true }
);

SubjectSchema.index({ ownerId: 1, order: 1 });
SubjectSchema.index({ ownerId: 1, name: 'text', description: 'text' });

export const Subject = model<ISubject>('Subject', SubjectSchema);
