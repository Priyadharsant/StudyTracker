import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import {
  SortableContext,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  Plus,
  MoreVertical,
  Edit2,
  Trash2,
  RotateCcw,
  CheckCircle2,
  Paperclip,
  ExternalLink
} from 'lucide-react';
import { Unit, Topic } from '../../types';
import { TopicItem } from '../topic/TopicItem';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface UnitSectionProps {
  unit: Unit;
  allUnits: Unit[];
  searchQuery: string;
  statusFilter: 'all' | 'completed' | 'pending';
  onUpdateUnit: (unit: Unit) => void;
  onDeleteUnit: (id: string) => void;
  onResetUnit: (id: string) => void;
  onAddTopic: (unitId: string) => void;
  onToggleTopicComplete: (id: string, completed: boolean) => void;
  onEditTopic: (topic: Topic) => void;
  onDeleteTopic: (id: string) => void;
  onMoveTopic: (id: string, targetUnitId: string) => void;
  onResetTopic: (id: string) => void;
  onOpenNotes: (topic: Topic) => void;
  onOpenMaterials: (topic: Topic) => void;
  onOpenUnitMaterials?: (unit: Unit) => void;
}

export const UnitSection: React.FC<UnitSectionProps> = ({
  unit,
  allUnits,
  searchQuery,
  statusFilter,
  onUpdateUnit,
  onDeleteUnit,
  onResetUnit,
  onAddTopic,
  onToggleTopicComplete,
  onEditTopic,
  onDeleteTopic,
  onMoveTopic,
  onResetTopic,
  onOpenNotes,
  onOpenMaterials,
  onOpenUnitMaterials
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: unit._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1
  };

  // Filter topics based on search & completion status
  const filteredTopics = (unit.topics || []).filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'completed'
        ? t.completed
        : !t.completed;

    return matchesSearch && matchesStatus;
  });

  const totalTopics = unit.topics?.length || 0;
  const completedTopics = unit.topics?.filter((t) => t.completed).length || 0;
  const progressPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden transition-all duration-200"
      >
        {/* Unit Header */}
        <div className="p-3.5 sm:p-4 bg-slate-50/70 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800">
          {/* Mobile First Line: Drag handle, Collapse, Unit Title & Menu */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              {/* Drag Handle */}
              <button
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 touch-none shrink-0"
                title="Drag unit to reorder"
              >
                <GripVertical className="w-4 h-4" />
              </button>

              {/* Collapse toggle */}
              <button
                type="button"
                onClick={() => setCollapsed(!collapsed)}
                className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-md transition shrink-0"
              >
                {collapsed ? <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" /> : <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>

              {/* Unit Title (prominent on its own first line on mobile) */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white break-words line-clamp-2 sm:truncate">
                    {unit.name}
                  </h3>
                  {completedTopics === totalTopics && totalTopics > 0 && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  )}
                </div>
                {unit.description && (
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                    {unit.description}
                  </p>
                )}
              </div>
            </div>

            {/* Desktop right controls / Mobile options menu */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Desktop Progress, Materials & Add Topic */}
              <div className="hidden sm:flex items-center gap-3">
                {/* Unit Materials Button */}
                {onOpenUnitMaterials && (
                  <button
                    type="button"
                    onClick={() => onOpenUnitMaterials(unit)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-lg transition"
                    title="Unit Study Materials & Documents"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>Materials</span>
                  </button>
                )}

                {/* Progress indicator */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {completedTopics}/{totalTopics}
                  </span>
                  <div className="w-16 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-500 w-8 text-right">
                    {progressPercent}%
                  </span>
                </div>

                {/* Add Topic button */}
                <button
                  type="button"
                  onClick={() => onAddTopic(unit._id)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-lg transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Topic</span>
                </button>
              </div>

              {/* Three-dot Options Menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
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
                      onClick={() => { setMenuOpen(false); onUpdateUnit(unit); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-blue-500" />
                      <span>Edit Unit</span>
                    </button>

                    {onOpenUnitMaterials && (
                      <button
                        type="button"
                        onClick={() => { setMenuOpen(false); onOpenUnitMaterials(unit); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <Paperclip className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Unit Materials & Docs</span>
                      </button>
                    )}

                    {completedTopics > 0 && (
                      <button
                        type="button"
                        onClick={() => { setMenuOpen(false); setResetConfirmOpen(true); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
                        <span>Reset Checklist</span>
                      </button>
                    )}

                    <div className="h-[1px] bg-slate-100 dark:bg-slate-800 my-1" />

                    <button
                      type="button"
                      onClick={() => { setMenuOpen(false); setDeleteConfirmOpen(true); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Unit</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Second Line: Progress and Material (cleanly placed underneath title) */}
          <div className="flex sm:hidden items-center justify-between gap-2 pt-2.5 mt-2 border-t border-slate-100 dark:border-slate-800/80">
            {/* Progress Bar & Percentage */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                {completedTopics}/{totalTopics}
              </span>
              <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden max-w-[120px]">
                <div
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-[11px] font-semibold text-slate-500">
                {progressPercent}%
              </span>
            </div>

            {/* Mobile Actions: Materials & Add Topic */}
            <div className="flex items-center gap-1.5 shrink-0">
              {onOpenUnitMaterials && (
                <button
                  type="button"
                  onClick={() => onOpenUnitMaterials(unit)}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 rounded-lg transition"
                >
                  <Paperclip className="w-3 h-3" />
                  <span>Materials</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onAddTopic(unit._id)}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 rounded-lg transition"
              >
                <Plus className="w-3 h-3" />
                <span>Topic</span>
              </button>
            </div>
          </div>
        </div>

        {/* Topic Checklist items */}
        {!collapsed && (
          <div className="p-3.5 sm:p-4 space-y-2.5">
            {/* Inline Unit Materials Display */}
            {unit.materials && unit.materials.length > 0 && (
              <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-900/40 rounded-xl space-y-2 mb-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5 uppercase tracking-wider">
                    <Paperclip className="w-3.5 h-3.5" /> Unit Study Materials & Syllabus Docs ({unit.materials.length})
                  </span>
                  {onOpenUnitMaterials && (
                    <button
                      type="button"
                      onClick={() => onOpenUnitMaterials(unit)}
                      className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      + Add / Manage
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {unit.materials.map((mat) => (
                    <a
                      key={mat._id}
                      href={mat.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-indigo-200/80 dark:border-indigo-800/80 hover:border-indigo-400 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-2xs transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="truncate max-w-[220px]">{mat.title}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
            {filteredTopics.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-4">
                <p className="text-xs text-slate-500">
                  {totalTopics === 0
                    ? 'No topics in this unit yet.'
                    : 'No topics match your active search or filter.'}
                </p>
                {totalTopics === 0 && (
                  <button
                    type="button"
                    onClick={() => onAddTopic(unit._id)}
                    className="mt-2 inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-blue-600 hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add First Topic
                  </button>
                )}
              </div>
            ) : (
              <SortableContext
                items={filteredTopics.map((t) => t._id)}
                strategy={verticalListSortingStrategy}
              >
                {filteredTopics.map((t) => (
                  <TopicItem
                    key={t._id}
                    topic={t}
                    allUnits={allUnits}
                    onToggleComplete={onToggleTopicComplete}
                    onEdit={onEditTopic}
                    onDelete={onDeleteTopic}
                    onMove={onMoveTopic}
                    onReset={onResetTopic}
                    onOpenNotes={onOpenNotes}
                    onOpenMaterials={onOpenMaterials}
                  />
                ))}
              </SortableContext>
            )}
          </div>
        )}
      </div>

      {/* Unit Reset Dialog */}
      <ConfirmDialog
        isOpen={resetConfirmOpen}
        title={`Reset Progress for "${unit.name}"?`}
        message="All completed topics in this unit will be marked as pending. Your study materials, uploaded documents, and revision notes will be completely preserved."
        confirmLabel="Reset Unit Progress"
        onConfirm={() => {
          onResetUnit(unit._id);
          setResetConfirmOpen(false);
        }}
        onCancel={() => setResetConfirmOpen(false)}
      />

      {/* Unit Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        title={`Delete Unit "${unit.name}"?`}
        message="Are you sure you want to delete this unit? All associated topics, notes, and study files will be permanently deleted."
        confirmLabel="Delete Unit"
        danger
        onConfirm={() => {
          onDeleteUnit(unit._id);
          setDeleteConfirmOpen(false);
        }}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </>
  );
};
