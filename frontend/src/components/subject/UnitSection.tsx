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
  CheckCircle2
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
  onOpenMaterials
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
        <div className="flex items-center justify-between p-4 bg-slate-50/70 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
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
              {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>

            {/* Title & Stats */}
            <div className="truncate flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900 dark:text-white truncate">
                  {unit.name}
                </h3>
                {completedTopics === totalTopics && totalTopics > 0 && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                )}
              </div>
              {unit.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {unit.description}
                </p>
              )}
            </div>
          </div>

          {/* Unit Progress Counter & Controls */}
          <div className="flex items-center gap-3 shrink-0">
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
              <span className="hidden sm:inline">Topic</span>
            </button>

            {/* Options dropdown */}
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

        {/* Topic Checklist items */}
        {!collapsed && (
          <div className="p-4 space-y-2.5">
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
