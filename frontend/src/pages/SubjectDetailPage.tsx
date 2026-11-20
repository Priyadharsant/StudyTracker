import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import {
  ArrowLeft,
  Plus,
  Search,
  Filter,
  RotateCcw,
  BookOpen,
  Calendar,
  Layers,
  Edit2,
  Trash2,
  Copy,
  Share2,
  Sparkles
} from 'lucide-react';
import api from '../services/api';
import { Subject, Unit, Topic } from '../types';
import { UnitSection } from '../components/subject/UnitSection';
import { StudyMaterialModal } from '../components/material/StudyMaterialModal';
import { RevisionNotesModal } from '../components/notes/RevisionNotesModal';
import { JsonImportModal } from '../components/common/JsonImportModal';
import { AiChecklistModal } from '../components/common/AiChecklistModal';
import { CreationChoiceModal } from '../components/common/CreationChoiceModal';
import { ShareSubjectModal } from '../components/subject/ShareSubjectModal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { useToast } from '../contexts/ToastContext';

export const SubjectDetailPage: React.FC = () => {
  const { id: subjectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [subject, setSubject] = useState<Subject | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  // Search and Filter within this subject
  const [topicSearch, setTopicSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending'>('all');

  // Modals state
  const [choiceModalOpen, setChoiceModalOpen] = useState(false);
  const [addUnitModalOpen, setAddUnitModalOpen] = useState(false);
  const [jsonImportModalOpen, setJsonImportModalOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [unitName, setUnitName] = useState('');
  const [unitDesc, setUnitDesc] = useState('');
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);

  const [addTopicModalOpen, setAddTopicModalOpen] = useState(false);
  const [targetUnitIdForTopic, setTargetUnitIdForTopic] = useState<string | null>(null);
  const [topicTitle, setTopicTitle] = useState('');
  const [topicDesc, setTopicDesc] = useState('');
  const [topicPriority, setTopicPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [topicDeadline, setTopicDeadline] = useState('');
  const [topicMaterialUrl, setTopicMaterialUrl] = useState('');
  const [topicMaterialTitle, setTopicMaterialTitle] = useState('');
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);

  // Attached materials & notes modal state
  const [activeMaterialTopic, setActiveMaterialTopic] = useState<Topic | null>(null);
  const [activeMaterialUnit, setActiveMaterialUnit] = useState<Unit | null>(null);
  const [activeNotesTopic, setActiveNotesTopic] = useState<Topic | null>(null);

  // Reset confirmations
  const [resetSubjectConfirmOpen, setResetSubjectConfirmOpen] = useState(false);
  const [deleteSubjectConfirmOpen, setDeleteSubjectConfirmOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchSubjectAndUnits = async () => {
    if (!subjectId) return;
    try {
      const [subRes, unitsRes] = await Promise.all([
        api.get(`/subjects/${subjectId}`),
        api.get(`/subjects/${subjectId}/units`)
      ]);

      if (subRes.data.success) {
        setSubject(subRes.data.subject);
      }
      if (unitsRes.data.success) {
        setUnits(unitsRes.data.units || []);
      }
    } catch {
      toast('Failed to load subject details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjectAndUnits();
  }, [subjectId]);

  // Unit creation / editing
  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitName.trim() || !subjectId) return;

    try {
      if (editingUnit) {
        const res = await api.patch(`/units/${editingUnit._id}`, {
          name: unitName,
          description: unitDesc
        });
        if (res.data.success) {
          toast('Unit updated successfully', 'success');
        }
      } else {
        const res = await api.post(`/subjects/${subjectId}/units`, {
          name: unitName,
          description: unitDesc
        });
        if (res.data.success) {
          toast('Unit created successfully', 'success');
        }
      }
      setAddUnitModalOpen(false);
      setEditingUnit(null);
      setUnitName('');
      setUnitDesc('');
      fetchSubjectAndUnits();
    } catch {
      toast('Failed to save unit', 'error');
    }
  };

  const handleDeleteUnit = async (unitId: string) => {
    try {
      await api.delete(`/units/${unitId}`);
      toast('Unit deleted successfully', 'info');
      fetchSubjectAndUnits();
    } catch {
      toast('Failed to delete unit', 'error');
    }
  };

  const handleResetUnit = async (unitId: string) => {
    try {
      await api.post(`/reset/unit/${unitId}`);
      toast('Unit progress reset successfully', 'info');
      fetchSubjectAndUnits();
    } catch {
      toast('Failed to reset unit progress', 'error');
    }
  };

  // Topic creation / editing
  const handleOpenAddTopic = (unitId: string) => {
    setEditingTopic(null);
    setTargetUnitIdForTopic(unitId);
    setTopicTitle('');
    setTopicDesc('');
    setTopicPriority('medium');
    setTopicDeadline('');
    setTopicMaterialUrl('');
    setTopicMaterialTitle('');
    setAddTopicModalOpen(true);
  };

  const handleOpenEditTopic = (topic: Topic) => {
    setEditingTopic(topic);
    setTargetUnitIdForTopic(typeof topic.unitId === 'string' ? topic.unitId : topic.unitId._id);
    setTopicTitle(topic.title);
    setTopicDesc(topic.description || '');
    setTopicPriority(topic.priority || 'medium');
    setTopicDeadline(topic.deadline ? topic.deadline.split('T')[0] : '');
    setTopicMaterialUrl('');
    setTopicMaterialTitle('');
    setAddTopicModalOpen(true);
  };

  const handleSaveTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicTitle.trim()) return;

    try {
      if (editingTopic) {
        const res = await api.patch(`/topics/${editingTopic._id}`, {
          title: topicTitle,
          description: topicDesc,
          priority: topicPriority,
          deadline: topicDeadline ? new Date(topicDeadline).toISOString() : null
        });
        if (res.data.success) {
          toast('Topic updated successfully', 'success');
        }
      } else if (targetUnitIdForTopic) {
        const res = await api.post(`/units/${targetUnitIdForTopic}/topics`, {
          title: topicTitle,
          description: topicDesc,
          priority: topicPriority,
          deadline: topicDeadline ? new Date(topicDeadline).toISOString() : null,
          materialUrl: topicMaterialUrl.trim() || undefined,
          materialTitle: topicMaterialTitle.trim() || undefined
        });
        if (res.data.success) {
          toast('Topic added successfully', 'success');
        }
      }

      setAddTopicModalOpen(false);
      setEditingTopic(null);
      fetchSubjectAndUnits();
    } catch {
      toast('Failed to save topic', 'error');
    }
  };

  const handleToggleTopicComplete = async (topicId: string, completed: boolean) => {
    // Optimistic UI update
    setUnits((prevUnits) =>
      prevUnits.map((u) => ({
        ...u,
        topics: u.topics.map((t) => (t._id === topicId ? { ...t, completed } : t))
      }))
    );

    try {
      await api.patch(`/topics/${topicId}/progress`, { completed });
      // Refresh to update stats on header
      fetchSubjectAndUnits();
    } catch {
      toast('Failed to update progress', 'error');
      fetchSubjectAndUnits();
    }
  };

  const handleDeleteTopic = async (topicId: string) => {
    try {
      await api.delete(`/topics/${topicId}`);
      toast('Topic deleted', 'info');
      fetchSubjectAndUnits();
    } catch {
      toast('Failed to delete topic', 'error');
    }
  };

  const handleMoveTopic = async (topicId: string, targetUnitId: string) => {
    try {
      const res = await api.patch(`/topics/${topicId}/move`, { targetUnitId });
      if (res.data.success) {
        toast('Topic moved successfully', 'success');
        fetchSubjectAndUnits();
      }
    } catch {
      toast('Failed to move topic', 'error');
    }
  };

  const handleResetTopic = async (topicId: string) => {
    try {
      await api.post(`/reset/topic/${topicId}`);
      toast('Topic progress reset', 'info');
      fetchSubjectAndUnits();
    } catch {
      toast('Failed to reset topic', 'error');
    }
  };

  const handleResetSubject = async () => {
    if (!subjectId) return;
    try {
      await api.post(`/reset/subject/${subjectId}`);
      toast('Subject checklist reset successfully', 'info');
      setResetSubjectConfirmOpen(false);
      fetchSubjectAndUnits();
    } catch {
      toast('Failed to reset subject progress', 'error');
    }
  };

  const handleDeleteSubject = async () => {
    if (!subjectId) return;
    try {
      await api.delete(`/subjects/${subjectId}`);
      toast('Subject deleted', 'info');
      navigate('/');
    } catch {
      toast('Failed to delete subject', 'error');
    }
  };

  // Drag and drop handler for reordering units & topics
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Check if dragging unit
    const activeUnitIndex = units.findIndex((u) => u._id === active.id);
    const overUnitIndex = units.findIndex((u) => u._id === over.id);

    if (activeUnitIndex !== -1 && overUnitIndex !== -1) {
      const reorderedUnits = arrayMove(units, activeUnitIndex, overUnitIndex);
      setUnits(reorderedUnits);

      try {
        await api.patch('/reorder', {
          type: 'unit',
          items: reorderedUnits.map((u, idx) => ({ id: u._id, order: idx }))
        });
      } catch {
        toast('Failed to save unit order', 'error');
      }
      return;
    }

    // Check if dragging topic within unit
    for (const unit of units) {
      const activeTopicIndex = unit.topics.findIndex((t) => t._id === active.id);
      const overTopicIndex = unit.topics.findIndex((t) => t._id === over.id);

      if (activeTopicIndex !== -1 && overTopicIndex !== -1) {
        const reorderedTopics = arrayMove(unit.topics, activeTopicIndex, overTopicIndex);
        setUnits((prev) =>
          prev.map((u) => (u._id === unit._id ? { ...u, topics: reorderedTopics } : u))
        );

        try {
          await api.patch('/reorder', {
            type: 'topic',
            items: reorderedTopics.map((t, idx) => ({ id: t._id, order: idx }))
          });
        } catch {
          toast('Failed to save topic order', 'error');
        }
        return;
      }
    }
  };

  if (loading || !subject) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
      </div>
    );
  }

  // Calculate subject overall progress
  const allTopicsInSubject = units.flatMap((u) => u.topics || []);
  const totalTopics = allTopicsInSubject.length;
  const completedTopics = allTopicsInSubject.filter((t) => t.completed).length;
  const progressPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShareModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share</span>
          </button>

          {completedTopics > 0 && (
            <button
              type="button"
              onClick={() => setResetSubjectConfirmOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl hover:bg-amber-100 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Progress</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setDeleteSubjectConfirmOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl hover:bg-rose-100 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Delete Subject</span>
          </button>
        </div>
      </div>

      {/* Subject Header Banner */}
      <div className="p-4 sm:p-8 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div
          className="absolute top-0 left-0 right-0 h-2"
          style={{ backgroundColor: subject.color || '#3B82F6' }}
        />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
          <div className="space-y-1.5 sm:space-y-2 flex-1 min-w-0">
            <div className="flex items-center gap-2.5">
              <span
                className="w-3.5 h-3.5 rounded-full shrink-0"
                style={{ backgroundColor: subject.color }}
              />
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-slate-400">
                Subject Syllabus
              </span>
            </div>
            <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight break-words">
              {subject.name}
            </h1>
            {subject.description && (
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl">
                {subject.description}
              </p>
            )}
          </div>

          {/* Progress Card in Banner */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 w-full lg:w-72 shrink-0">
            <div className="flex items-center justify-between text-xs font-semibold mb-2">
              <span className="text-slate-500">Subject Progress</span>
              <span className="text-blue-600 dark:text-blue-400 font-bold text-sm">
                {progressPercent}%
              </span>
            </div>

            <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${progressPercent}%`,
                  backgroundColor: subject.color || '#3B82F6'
                }}
              />
            </div>

            <div className="flex justify-between items-center text-[11px] text-slate-400 mt-2">
              <span>{completedTopics} completed</span>
              <span>{totalTopics - completedTopics} remaining</span>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar: Search topics, Filter status, Add Unit button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Topic search */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              placeholder="Search topics in this subject..."
              value={topicSearch}
              onChange={(e) => setTopicSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Completion status filter */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-medium">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusFilter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All ({totalTopics})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusFilter === 'pending'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Pending ({totalTopics - completedTopics})
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusFilter === 'completed'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Completed ({completedTopics})
            </button>
          </div>
        </div>

        {/* Add Unit Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setChoiceModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Unit / Chapter</span>
          </button>
        </div>
      </div>

      {/* Units List with DnD */}
      {units.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-8 bg-white/50 dark:bg-slate-900/50">
          <Layers className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
            No units added to this subject yet
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Divide your syllabus into units (e.g. &quot;Unit 1: Fundamentals&quot;) to start adding topics.
          </p>
          <button
            onClick={() => setAddUnitModalOpen(true)}
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md transition"
          >
            <Plus className="w-4 h-4" /> Add First Unit
          </button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={units.map((u) => u._id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {units.map((unit) => (
                <UnitSection
                  key={unit._id}
                  unit={unit}
                  allUnits={units}
                  searchQuery={topicSearch}
                  statusFilter={statusFilter}
                  onUpdateUnit={(u) => {
                    setEditingUnit(u);
                    setUnitName(u.name);
                    setUnitDesc(u.description || '');
                    setAddUnitModalOpen(true);
                  }}
                  onDeleteUnit={handleDeleteUnit}
                  onResetUnit={handleResetUnit}
                  onAddTopic={handleOpenAddTopic}
                  onToggleTopicComplete={handleToggleTopicComplete}
                  onEditTopic={handleOpenEditTopic}
                  onDeleteTopic={handleDeleteTopic}
                  onMoveTopic={handleMoveTopic}
                  onResetTopic={handleResetTopic}
                  onOpenNotes={(t) => navigate(`/topics/${t._id}/notes`)}
                  onOpenMaterials={(t) => setActiveMaterialTopic(t)}
                  onOpenUnitMaterials={(u) => setActiveMaterialUnit(u)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Modal: Add / Edit Unit */}
      {addUnitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95">
            <h3 className="font-extrabold text-lg text-slate-900 dark:text-white mb-1">
              {editingUnit ? 'Edit Unit' : 'Add New Unit'}
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Enter the unit name and optional description or syllabus details.
            </p>

            <form onSubmit={handleSaveUnit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Unit Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Unit 1: Foundations of Algorithms"
                  value={unitName}
                  onChange={(e) => setUnitName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Description (optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Details on chapters covered or prerequisites..."
                  value={unitDesc}
                  onChange={(e) => setUnitDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div className="pt-3 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAddUnitModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
                >
                  {editingUnit ? 'Save Changes' : 'Create Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add / Edit Topic */}
      {addTopicModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95">
            <h3 className="font-extrabold text-lg text-slate-900 dark:text-white mb-1">
              {editingTopic ? 'Edit Topic' : 'Add New Topic'}
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Specify the topic title, priority, target deadline and notes.
            </p>

            <form onSubmit={handleSaveTopic} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Topic Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Asymptotic Notation (Big-O, Big-Omega, Big-Theta)"
                  value={topicTitle}
                  onChange={(e) => setTopicTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Description (optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Key concepts or textbook page references..."
                  value={topicDesc}
                  onChange={(e) => setTopicDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={topicPriority}
                    onChange={(e) => setTopicPriority(e.target.value as any)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-hidden"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Target Deadline
                  </label>
                  <input
                    type="date"
                    value={topicDeadline}
                    onChange={(e) => setTopicDeadline(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-hidden"
                  />
                </div>
              </div>

              {!editingTopic && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                    + Attach Study Material Link (Optional)
                  </span>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Material URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://example.com/notes or youtube link"
                      value={topicMaterialUrl}
                      onChange={(e) => setTopicMaterialUrl(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-hidden focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Material Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Lecture Notes / Documentation"
                      value={topicMaterialTitle}
                      onChange={(e) => setTopicMaterialTitle(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-hidden focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              <div className="pt-3 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAddTopicModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
                >
                  {editingTopic ? 'Save Changes' : 'Add Topic'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Study Materials & Documents */}
      {activeMaterialTopic && (
        <StudyMaterialModal
          isOpen={!!activeMaterialTopic}
          topicId={activeMaterialTopic._id}
          topicTitle={activeMaterialTopic.title}
          onClose={() => setActiveMaterialTopic(null)}
          onMaterialCountChange={fetchSubjectAndUnits}
        />
      )}

      {/* Modal: Unit Study Materials & Documents */}
      {activeMaterialUnit && (
        <StudyMaterialModal
          isOpen={!!activeMaterialUnit}
          unitId={activeMaterialUnit._id}
          unitTitle={activeMaterialUnit.name}
          onClose={() => setActiveMaterialUnit(null)}
          onMaterialCountChange={fetchSubjectAndUnits}
        />
      )}

      {/* Modal: Revision Notes */}
      {activeNotesTopic && (
        <RevisionNotesModal
          isOpen={!!activeNotesTopic}
          topicId={activeNotesTopic._id}
          topicTitle={activeNotesTopic.title}
          onClose={() => setActiveNotesTopic(null)}
          onSaved={fetchSubjectAndUnits}
        />
      )}

      {/* Confirmation: Reset Subject Progress */}
      <ConfirmDialog
        isOpen={resetSubjectConfirmOpen}
        title={`Reset Progress for "${subject.name}"?`}
        message="All completed topics in this subject will be marked as pending. Your attached study materials, documents, and revision notes will be completely preserved."
        confirmLabel="Reset Subject Progress"
        onConfirm={handleResetSubject}
        onCancel={() => setResetSubjectConfirmOpen(false)}
      />

      {/* Confirmation: Delete Entire Subject */}
      <ConfirmDialog
        isOpen={deleteSubjectConfirmOpen}
        title={`Delete Subject "${subject.name}"?`}
        message="Are you sure you want to delete this subject? All units, topics, revision notes, and uploaded documents will be permanently deleted."
        confirmLabel="Delete Subject"
        danger
        onConfirm={handleDeleteSubject}
        onCancel={() => setDeleteSubjectConfirmOpen(false)}
      />

      {/* Add Unit Choice Modal */}
      <CreationChoiceModal
        isOpen={choiceModalOpen}
        onClose={() => setChoiceModalOpen(false)}
        title="Add to Subject"
        subtitle={`Select how you want to add units or topics to "${subject.name}"`}
        onSelectAi={() => setAiModalOpen(true)}
        onSelectJson={() => setJsonImportModalOpen(true)}
        onSelectManual={() => {
          setEditingUnit(null);
          setUnitName('');
          setUnitDesc('');
          setAddUnitModalOpen(true);
        }}
        manualLabel="Add Unit Manually"
        manualDesc="Create a blank unit/chapter and manually input topics one by one."
      />

      {/* JSON Import Modal */}
      <JsonImportModal
        isOpen={jsonImportModalOpen}
        onClose={() => setJsonImportModalOpen(false)}
        subjects={subject ? [subject] : []}
        initialSubjectId={subjectId}
        onImportSuccess={() => fetchSubjectAndUnits()}
      />

      {/* AI Checklist Modal */}
      <AiChecklistModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        subjects={subject ? [subject] : []}
        initialSubjectId={subjectId}
        onSuccess={() => fetchSubjectAndUnits()}
      />

      {/* Share Subject Modal */}
      {shareModalOpen && subject && (
        <ShareSubjectModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          subjectId={subject._id}
          subjectName={subject.name}
        />
      )}
    </div>
  );
};
