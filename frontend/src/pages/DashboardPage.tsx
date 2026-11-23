import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  CheckCircle2,
  ListTodo,
  TrendingUp,
  Plus,
  ArrowRight,
  Clock,
  FileText,
  Search,
  Sparkles
} from 'lucide-react';
import api from '../services/api';
import { Subject, Topic, Note, DashboardStats } from '../types';
import { SubjectCard } from '../components/subject/SubjectCard';
import { JsonImportModal } from '../components/common/JsonImportModal';
import { AiChecklistModal } from '../components/common/AiChecklistModal';
import { CreationChoiceModal } from '../components/common/CreationChoiceModal';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { CustomSelect } from '../components/common/CustomSelect';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [subjectCards, setSubjectCards] = useState<Subject[]>([]);
  const [recentlyStudied, setRecentlyStudied] = useState<Topic[]>([]);
  const [recentNotes, setRecentNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick subject create dialog state
  const [choiceModalOpen, setChoiceModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [jsonImportModalOpen, setJsonImportModalOpen] = useState(false);
  const [subjectName, setSubjectName] = useState('');
  const [subjectDesc, setSubjectDesc] = useState('');
  const [subjectColor, setSubjectColor] = useState('#3B82F6');
  const [creating, setCreating] = useState(false);

  // Reset confirmation state
  const [resetAllConfirmOpen, setResetAllConfirmOpen] = useState(false);
  const [resetSubjectId, setResetSubjectId] = useState<string | null>(null);
  const [deleteSubjectId, setDeleteSubjectId] = useState<string | null>(null);

  // Search & Filter in Dashboard
  const [searchFilter, setSearchFilter] = useState('');
  const [sortBy, setSortBy] = useState<'updated' | 'name' | 'progress'>('updated');

  const fetchDashboardData = async () => {
    try {
      const res = await api.get('/dashboard');
      if (res.data.success) {
        setStats(res.data.stats);
        setSubjectCards(res.data.subjectCards || []);
        setRecentlyStudied(res.data.recentlyStudiedTopics || []);
        setRecentNotes(res.data.recentlyUpdatedNotes || []);
      }
    } catch {
      toast('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName.trim()) return;

    setCreating(true);
    try {
      const res = await api.post('/subjects', {
        name: subjectName,
        description: subjectDesc,
        color: subjectColor,
        icon: 'BookOpen'
      });

      if (res.data.success) {
        toast('Subject created successfully!', 'success');
        setSubjectName('');
        setSubjectDesc('');
        setCreateModalOpen(false);
        fetchDashboardData();
      }
    } catch (err: any) {
      toast(err.response?.data?.message || 'Failed to create subject', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDuplicateSubject = async (id: string) => {
    try {
      const res = await api.post(`/subjects/${id}/duplicate`);
      if (res.data.success) {
        toast('Subject duplicated successfully!', 'success');
        fetchDashboardData();
      }
    } catch {
      toast('Failed to duplicate subject', 'error');
    }
  };

  const handleResetSubject = async () => {
    if (!resetSubjectId) return;
    try {
      await api.post(`/reset/subject/${resetSubjectId}`);
      toast('Subject checklist reset successfully', 'info');
      setResetSubjectId(null);
      fetchDashboardData();
    } catch {
      toast('Failed to reset subject progress', 'error');
    }
  };

  const handleDeleteSubject = async () => {
    if (!deleteSubjectId) return;
    try {
      await api.delete(`/subjects/${deleteSubjectId}`);
      toast('Subject deleted successfully', 'info');
      setDeleteSubjectId(null);
      fetchDashboardData();
    } catch {
      toast('Failed to delete subject', 'error');
    }
  };

  const handleResetAll = async () => {
    try {
      await api.post('/reset/all');
      toast('All study checklist progress has been reset', 'info');
      setResetAllConfirmOpen(false);
      fetchDashboardData();
    } catch {
      toast('Failed to reset progress', 'error');
    }
  };

  // Sort and filter subject cards by subject name or topics
  const searchFilterLower = searchFilter.toLowerCase().trim();
  const displayedSubjects = subjectCards
    .filter((s) =>
      s.name.toLowerCase().includes(searchFilterLower) ||
      (s.description || '').toLowerCase().includes(searchFilterLower) ||
      (s.topicTitles && s.topicTitles.some((t) => t.toLowerCase().includes(searchFilterLower)))
    )
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'progress') return (b.progressPercentage || 0) - (a.progressPercentage || 0);
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-linear-to-r from-blue-600 to-indigo-700 text-white shadow-xl shadow-blue-500/10">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 backdrop-blur-md mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Welcome back, {user?.name}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Study Checklist Dashboard
          </h1>
          <p className="text-blue-100 text-sm mt-1">
            Track units, review topics, manage study files and revision notes
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setChoiceModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-blue-700 font-bold text-sm rounded-xl hover:bg-blue-50 shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Subject</span>
          </button>
        </div>
      </div>

      {/* Progress Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Subjects */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Subjects
            </p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
              {stats?.totalSubjects || 0}
            </h3>
          </div>
        </div>

        {/* Units / Topics */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
            <ListTodo className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Units / Topics
            </p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
              {stats?.totalUnits || 0} <span className="text-sm font-normal text-slate-400">/ {stats?.totalTopics || 0}</span>
            </h3>
          </div>
        </div>

        {/* Completed Topics */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Completed Topics
            </p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
              {stats?.completedTopics || 0}{' '}
              <span className="text-xs font-medium text-slate-400">
                ({stats?.remainingTopics || 0} left)
              </span>
            </h3>
          </div>
        </div>

        {/* Overall Completion */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Overall Progress
            </p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
                {stats?.overallPercentage || 0}%
              </h3>
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-purple-600 rounded-full transition-all duration-300"
                style={{ width: `${stats?.overallPercentage || 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Subject-Wise Progress Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Subject Overview
            </h2>
            <p className="text-xs text-slate-500">
              Manage study units, check off topics, and inspect progress
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search subjects or topics..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Sort Dropdown */}
            <CustomSelect
              value={sortBy}
              onChange={(val) => setSortBy(val as any)}
              options={[
                { value: 'updated', label: 'Recently Updated' },
                { value: 'name', label: 'Subject Name' },
                { value: 'progress', label: 'Highest Progress' }
              ]}
            />

            {/* Reset All Progress */}
            {stats && stats.completedTopics > 0 && (
              <button
                type="button"
                onClick={() => setResetAllConfirmOpen(true)}
                className="text-xs font-semibold px-3 py-1.5 text-amber-600 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl hover:bg-amber-100 transition"
              >
                Reset All Progress
              </button>
            )}
          </div>
        </div>

        {/* Subjects Grid */}
        {displayedSubjects.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-8 bg-white/50 dark:bg-slate-900/50">
            <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
              No subjects found
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Get started by creating your first subject to organize your syllabus into units and topics.
            </p>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md transition"
            >
              <Plus className="w-4 h-4" /> Create Your First Subject
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayedSubjects.map((sub) => (
              <SubjectCard
                key={sub._id}
                subject={sub}
                onEdit={() => {}}
                onDuplicate={handleDuplicateSubject}
                onReset={(id) => setResetSubjectId(id)}
                onDelete={(id) => setDeleteSubjectId(id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom widgets: Recently Studied Topics & Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
        {/* Recently Studied Topics */}
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Recently Studied Topics
              </h3>
            </div>
            <Link to="/subjects" className="text-xs text-blue-600 hover:underline">
              View all &rarr;
            </Link>
          </div>

          {recentlyStudied.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No recent topic activity yet.</p>
          ) : (
            <div className="space-y-3">
              {recentlyStudied.map((t) => {
                const sub = typeof t.subjectId === 'object' ? t.subjectId : null;
                const unit = typeof t.unitId === 'object' ? t.unitId : null;
                return (
                  <div
                    key={t._id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 gap-2"
                  >
                    <div className="truncate flex-1">
                      <h4 className={`text-xs font-semibold truncate ${t.completed ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                        {t.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate">
                        {sub?.name || 'Subject'} &bull; {unit?.name || 'Unit'}
                      </p>
                    </div>
                    {sub?._id && (
                      <Link
                        to={`/subjects/${sub._id}`}
                        className="text-[11px] font-bold text-blue-600 hover:underline shrink-0"
                      >
                        Open
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recently Updated Notes */}
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Recently Updated Revision Notes
              </h3>
            </div>
            <Link to="/notes" className="text-xs text-blue-600 hover:underline">
              View all notes &rarr;
            </Link>
          </div>

          {recentNotes.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No revision notes written yet.</p>
          ) : (
            <div className="space-y-3">
              {recentNotes.map((n) => {
                const sub = typeof n.subjectId === 'object' ? n.subjectId : null;
                const topic = typeof n.topicId === 'object' ? n.topicId : null;
                // Strip HTML tags for clean preview
                const cleanContent = n.content.replace(/<[^>]*>?/gm, '').trim();

                return (
                  <div
                    key={n._id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-900 dark:text-white truncate">
                        {topic?.title || 'Topic Note'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(n.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-1 font-mono">
                      {cleanContent || 'Empty note content'}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Create Subject */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95">
            <h3 className="font-extrabold text-lg text-slate-900 dark:text-white mb-1">
              Add New Subject
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Enter subject details to begin adding syllabus units and topics.
            </p>

            <form onSubmit={handleCreateSubject} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Subject Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Data Structures & Algorithms, Physics 101"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Course objectives, semester details, or exam schedule..."
                  value={subjectDesc}
                  onChange={(e) => setSubjectDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Color Theme
                </label>
                <div className="flex items-center gap-2">
                  {['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSubjectColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform ${
                        subjectColor === c ? 'scale-125 ring-2 ring-offset-2 ring-blue-500' : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation: Reset All Progress */}
      <ConfirmDialog
        isOpen={resetAllConfirmOpen}
        title="Reset All Checklist Progress?"
        message="Are you sure you want to reset all checklist progress across all your subjects? All topics will be marked pending. All subjects, units, notes, and study files will be completely preserved."
        confirmLabel="Reset All Progress"
        danger
        onConfirm={handleResetAll}
        onCancel={() => setResetAllConfirmOpen(false)}
      />

      {/* Confirmation: Reset Single Subject */}
      <ConfirmDialog
        isOpen={!!resetSubjectId}
        title="Reset Subject Progress?"
        message="All topics in this subject will be marked as incomplete. All units, topics, uploaded documents, and notes will remain untouched."
        confirmLabel="Reset Subject"
        onConfirm={handleResetSubject}
        onCancel={() => setResetSubjectId(null)}
      />

      {/* Confirmation: Delete Subject */}
      <ConfirmDialog
        isOpen={!!deleteSubjectId}
        title="Delete Subject?"
        message="Are you sure you want to delete this subject? All associated units, topics, revision notes, and uploaded files will be permanently deleted."
        confirmLabel="Delete Subject"
        danger
        onConfirm={handleDeleteSubject}
        onCancel={() => setDeleteSubjectId(null)}
      />

      {/* Add Subject Choice Modal */}
      <CreationChoiceModal
        isOpen={choiceModalOpen}
        onClose={() => setChoiceModalOpen(false)}
        title="Add Subject"
        subtitle="Choose how you want to build this study subject checklist"
        onSelectAi={() => setAiModalOpen(true)}
        onSelectJson={() => setJsonImportModalOpen(true)}
        onSelectManual={() => {
          setSubjectName('');
          setSubjectDesc('');
          setSubjectColor('#3B82F6');
          setCreateModalOpen(true);
        }}
        manualLabel="Create Manually"
        manualDesc="Enter subject title, description and theme color manually."
      />

      {/* AI Checklist Modal */}
      <AiChecklistModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        subjects={subjectCards}
        onSuccess={() => fetchDashboardData()}
      />

      {/* JSON Import Modal */}
      <JsonImportModal
        isOpen={jsonImportModalOpen}
        onClose={() => setJsonImportModalOpen(false)}
        subjects={subjectCards}
        onImportSuccess={() => fetchDashboardData()}
      />
    </div>
  );
};
