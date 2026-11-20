import React, { useState, useEffect } from 'react';
import { Plus, Search, BookOpen, Sparkles } from 'lucide-react';
import api from '../services/api';
import { Subject } from '../types';
import { SubjectCard } from '../components/subject/SubjectCard';
import { JsonImportModal } from '../components/common/JsonImportModal';
import { AiChecklistModal } from '../components/common/AiChecklistModal';
import { CreationChoiceModal } from '../components/common/CreationChoiceModal';
import { ShareSubjectModal } from '../components/subject/ShareSubjectModal';
import { useToast } from '../contexts/ToastContext';
import { ConfirmDialog } from '../components/common/ConfirmDialog';

export const SubjectsPage: React.FC = () => {
  const { toast } = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [choiceModalOpen, setChoiceModalOpen] = useState(false);
  const [jsonImportModalOpen, setJsonImportModalOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [sharingSubject, setSharingSubject] = useState<Subject | null>(null);

  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [saving, setSaving] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [resetId, setResetId] = useState<string | null>(null);

  const fetchSubjects = async () => {
    try {
      const res = await api.get('/subjects');
      if (res.data.success) {
        setSubjects(res.data.subjects || []);
      }
    } catch {
      toast('Failed to load subjects', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      if (editingSubject) {
        await api.patch(`/subjects/${editingSubject._id}`, {
          name,
          description: desc,
          color
        });
        toast('Subject updated successfully', 'success');
      } else {
        await api.post('/subjects', {
          name,
          description: desc,
          color,
          icon: 'BookOpen'
        });
        toast('Subject created successfully', 'success');
      }
      setCreateModalOpen(false);
      setEditingSubject(null);
      setName('');
      setDesc('');
      fetchSubjects();
    } catch (err: any) {
      toast(err.response?.data?.message || 'Failed to save subject', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const res = await api.post(`/subjects/${id}/duplicate`);
      if (res.data.success) {
        toast('Subject duplicated successfully', 'success');
        fetchSubjects();
      }
    } catch {
      toast('Failed to duplicate subject', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/subjects/${deleteId}`);
      toast('Subject deleted successfully', 'info');
      setDeleteId(null);
      fetchSubjects();
    } catch {
      toast('Failed to delete subject', 'error');
    }
  };

  const handleReset = async () => {
    if (!resetId) return;
    try {
      await api.post(`/reset/subject/${resetId}`);
      toast('Subject checklist reset successfully', 'info');
      setResetId(null);
      fetchSubjects();
    } catch {
      toast('Failed to reset subject progress', 'error');
    }
  };

  const filtered = subjects.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.description || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            My Subjects
          </h1>
          <p className="text-xs text-slate-500">
            View and manage all your registered courses, syllabi and checklists
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              placeholder="Search subjects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="button"
            onClick={() => setChoiceModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Subject</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-56 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-8 bg-white/50 dark:bg-slate-900/50">
          <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            No subjects match your criteria
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Create a new subject to begin tracking your syllabus checklist.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((sub) => (
            <SubjectCard
              key={sub._id}
              subject={sub}
              onEdit={(s) => {
                setEditingSubject(s);
                setName(s.name);
                setDesc(s.description || '');
                setColor(s.color || '#3B82F6');
                setCreateModalOpen(true);
              }}
              onDuplicate={handleDuplicate}
              onReset={(id) => setResetId(id)}
              onDelete={(id) => setDeleteId(id)}
              onShare={(s) => setSharingSubject(s)}
            />
          ))}
        </div>
      )}

      {/* Subject Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95">
            <h3 className="font-extrabold text-lg text-slate-900 dark:text-white mb-1">
              {editingSubject ? 'Edit Subject' : 'Add New Subject'}
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Enter subject details and theme color.
            </p>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Subject Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Operating Systems"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Course information, units overview or professor details..."
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
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
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform ${
                        color === c ? 'scale-125 ring-2 ring-offset-2 ring-blue-500' : 'hover:scale-110'
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
                  disabled={saving}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingSubject ? 'Save Changes' : 'Create Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation: Reset Progress */}
      <ConfirmDialog
        isOpen={!!resetId}
        title="Reset Subject Progress?"
        message="All topics in this subject will be marked as incomplete. Your materials and revision notes will be preserved."
        confirmLabel="Reset Progress"
        onConfirm={handleReset}
        onCancel={() => setResetId(null)}
      />

      {/* Confirmation: Delete Subject */}
      <ConfirmDialog
        isOpen={!!deleteId}
        title="Delete Subject?"
        message="Are you sure you want to delete this subject? All units, topics, notes and documents will be permanently removed."
        confirmLabel="Delete Subject"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
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
          setEditingSubject(null);
          setName('');
          setDesc('');
          setColor('#3B82F6');
          setCreateModalOpen(true);
        }}
        manualLabel="Create Manually"
        manualDesc="Enter subject title, description and theme color manually."
      />

      {/* JSON Import Modal */}
      <JsonImportModal
        isOpen={jsonImportModalOpen}
        onClose={() => setJsonImportModalOpen(false)}
        subjects={subjects}
        onImportSuccess={() => fetchSubjects()}
      />

      {/* AI Checklist Modal */}
      <AiChecklistModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        subjects={subjects}
        onSuccess={() => fetchSubjects()}
      />

      {/* Share Subject Modal */}
      {sharingSubject && (
        <ShareSubjectModal
          isOpen={!!sharingSubject}
          onClose={() => setSharingSubject(null)}
          subjectId={sharingSubject._id}
          subjectName={sharingSubject.name}
        />
      )}
    </div>
  );
};
