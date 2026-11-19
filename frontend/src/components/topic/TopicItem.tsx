import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  CheckSquare,
  Square,
  FileText,
  Paperclip,
  Calendar,
  MoreVertical,
  Trash2,
  Edit2,
  FolderInput,
  RotateCcw,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Topic, Unit } from '../../types';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface TopicItemProps {
  topic: Topic;
  allUnits: Unit[];
  onToggleComplete: (id: string, completed: boolean) => void;
  onEdit: (topic: Topic) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, targetUnitId: string) => void;
  onReset: (id: string) => void;
  onOpenNotes: (topic: Topic) => void;
  onOpenMaterials: (topic: Topic) => void;
}

export const TopicItem: React.FC<TopicItemProps> = ({
  topic,
  allUnits,
  onToggleComplete,
  onEdit,
  onDelete,
  onMove,
  onReset,
  onOpenNotes,
  onOpenMaterials
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [showInlineMaterials, setShowInlineMaterials] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: topic._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1
  };

  const priorityColors = {
    low: 'text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400',
    medium: 'text-blue-700 bg-blue-100 dark:bg-blue-950/60 dark:text-blue-400',
    high: 'text-rose-700 bg-rose-100 dark:bg-rose-950/60 dark:text-rose-400'
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`group flex items-start gap-3 p-3.5 rounded-xl border transition-all duration-200 ${
          topic.completed
            ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/80 opacity-80'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/80 hover:border-blue-300 dark:hover:border-blue-900 shadow-xs'
        }`}
      >
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 mt-1 touch-none"
          title="Drag to reorder"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        {/* Checkbox */}
        <button
          type="button"
          onClick={() => onToggleComplete(topic._id, !topic.completed)}
          className="mt-0.5 text-blue-600 dark:text-blue-400 hover:scale-110 transition-transform shrink-0"
        >
          {topic.completed ? (
            <CheckSquare className="w-5 h-5 fill-blue-600 text-white dark:fill-blue-500" />
          ) : (
            <Square className="w-5 h-5 text-slate-400 hover:text-blue-600" />
          )}
        </button>

        {/* Topic details */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4
              className={`text-sm font-semibold truncate ${
                topic.completed
                  ? 'line-through text-slate-400 dark:text-slate-500 font-normal'
                  : 'text-slate-900 dark:text-white'
              }`}
            >
              {topic.title}
            </h4>

            {/* Priority Badge */}
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${priorityColors[topic.priority] || priorityColors.medium}`}>
              {topic.priority}
            </span>

            {/* Deadline tag */}
            {topic.deadline && (
              <span className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                <Calendar className="w-3 h-3" />
                {new Date(topic.deadline).toLocaleDateString()}
              </span>
            )}
          </div>

          {topic.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
              {topic.description}
            </p>
          )}

          {/* Action tags (Materials, Notes) */}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {(topic.materialCount || 0) > 0 && (
              <button
                type="button"
                onClick={() => setShowInlineMaterials(!showInlineMaterials)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition"
              >
                <Paperclip className="w-3.5 h-3.5" />
                <span>{topic.materialCount} Materials</span>
                {showInlineMaterials ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}

            <button
              type="button"
              onClick={() => onOpenMaterials(topic)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition"
            >
              <Paperclip className="w-3.5 h-3.5" />
              <span>{(topic.materialCount || 0) === 0 ? 'Attach Materials' : 'Manage'}</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenNotes(topic)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border transition ${
                topic.hasNotes
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white border-transparent hover:border-slate-200 dark:hover:border-slate-700'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{topic.hasNotes ? 'Revision Notes' : 'Add Notes'}</span>
            </button>
          </div>

          {/* Inline Attached Materials Panel */}
          {showInlineMaterials && topic.materials && topic.materials.length > 0 && (
            <div className="mt-3 p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-1.5 animate-in fade-in">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-1">
                Attached Study Materials:
              </span>
              <div className="flex flex-wrap gap-2">
                {topic.materials.map((mat) => (
                  <a
                    key={mat._id}
                    href={mat.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 shadow-2xs transition"
                  >
                    <ExternalLink className="w-3 h-3 text-blue-500 shrink-0" />
                    <span className="truncate max-w-[200px]">{mat.title}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* More Actions Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 mt-1 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-20 py-1 text-xs animate-in fade-in"
              onMouseLeave={() => setMenuOpen(false)}
            >
              <button
                type="button"
                onClick={() => { setMenuOpen(false); onEdit(topic); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Edit2 className="w-3.5 h-3.5 text-blue-500" />
                <span>Edit Topic</span>
              </button>

              <button
                type="button"
                onClick={() => { setMenuOpen(false); setMoveModalOpen(true); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <FolderInput className="w-3.5 h-3.5 text-purple-500" />
                <span>Move to Unit</span>
              </button>

              {topic.completed && (
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); setResetConfirmOpen(true); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
                  <span>Reset Progress</span>
                </button>
              )}

              <div className="h-[1px] bg-slate-100 dark:bg-slate-800 my-1" />

              <button
                type="button"
                onClick={() => { setMenuOpen(false); setDeleteConfirmOpen(true); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Topic</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Move Unit Dialog */}
      {moveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xl">
            <h3 className="font-semibold text-base text-slate-900 dark:text-white mb-2">
              Move Topic to Unit
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Select destination unit for &quot;{topic.title}&quot;:
            </p>
            <div className="space-y-1.5 max-h-56 overflow-y-auto mb-4">
              {allUnits.map((u) => {
                const currentUnitId = typeof topic.unitId === 'string' ? topic.unitId : topic.unitId?._id;
                const isCurrent = currentUnitId === u._id;
                return (
                  <button
                    key={u._id}
                    disabled={isCurrent}
                    onClick={() => {
                      onMove(topic._id, u._id);
                      setMoveModalOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition ${
                      isCurrent
                        ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800'
                        : 'hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <span>{u.name}</span>
                    {isCurrent && <span className="text-[10px] text-slate-400">(Current)</span>}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setMoveModalOpen(false)}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Progress Confirmation */}
      <ConfirmDialog
        isOpen={resetConfirmOpen}
        title="Reset Topic Progress?"
        message={`Mark "${topic.title}" as pending? Your attached materials and revision notes will be completely preserved.`}
        confirmLabel="Reset Topic"
        onConfirm={() => {
          onReset(topic._id);
          setResetConfirmOpen(false);
        }}
        onCancel={() => setResetConfirmOpen(false)}
      />

      {/* Delete Topic Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        title="Delete Topic?"
        message={`Are you sure you want to delete "${topic.title}"? Associated revision notes and documents will also be permanently removed.`}
        confirmLabel="Delete Topic"
        danger
        onConfirm={() => {
          onDelete(topic._id);
          setDeleteConfirmOpen(false);
        }}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </>
  );
};
