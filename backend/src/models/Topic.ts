import { Schema, model, Document, Types } from 'mongoose';

export interface ITopic extends Document {
  ownerId: Types.ObjectId;
  subjectId: Types.ObjectId;
  unitId: Types.ObjectId;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  deadline?: Date | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const TopicSchema = new Schema<ITopic>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    unitId: { type: Schema.Types.ObjectId, ref: 'Unit', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    completed: { type: Boolean, default: false, index: true },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    deadline: { type: Date, default: null },
    order: { type: Number, default: 0, index: true }
  },
  { timestamps: true }
);

TopicSchema.index({ unitId: 1, order: 1 });
TopicSchema.index({ subjectId: 1, completed: 1 });
TopicSchema.index({ ownerId: 1, title: 'text', description: 'text' });

export const Topic = model<ITopic>('Topic', TopicSchema);
