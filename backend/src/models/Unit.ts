import { Schema, model, Document, Types } from 'mongoose';

export interface IUnit extends Document {
  ownerId: Types.ObjectId;
  subjectId: Types.ObjectId;
  name: string;
  description?: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const UnitSchema = new Schema<IUnit>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    order: { type: Number, default: 0, index: true }
  },
  { timestamps: true }
);

UnitSchema.index({ subjectId: 1, order: 1 });
UnitSchema.index({ ownerId: 1, name: 'text', description: 'text' });

export const Unit = model<IUnit>('Unit', UnitSchema);
