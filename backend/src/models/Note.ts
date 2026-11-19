import { Schema, model, Document, Types } from 'mongoose';

export interface INote extends Document {
  ownerId: Types.ObjectId;
  subjectId: Types.ObjectId;
  unitId: Types.ObjectId;
  topicId: Types.ObjectId;
  content: string; // Rich-text HTML or JSON string
  createdAt: Date;
  updatedAt: Date;
}

const NoteSchema = new Schema<INote>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    unitId: { type: Schema.Types.ObjectId, ref: 'Unit', required: true, index: true },
    topicId: { type: Schema.Types.ObjectId, ref: 'Topic', required: true, index: true },
    content: { type: String, default: '' }
  },
  { timestamps: true }
);

NoteSchema.index({ topicId: 1 });
NoteSchema.index({ ownerId: 1, content: 'text' });

export const Note = model<INote>('Note', NoteSchema);
