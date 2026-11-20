import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Search, BookOpen, Clock, Trash2, Edit3 } from 'lucide-react';
import api from '../services/api';
import { Note } from '../types';
import { RevisionNotesModal } from '../components/notes/RevisionNotesModal';
import { useToast } from '../contexts/ToastContext';
import { ConfirmDialog } from '../components/common/ConfirmDialog';

export const NotesPage: React.FC = () => {
  const { toast } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Active note for modal editor
  const [activeTopic, setActiveTopic] = useState<{ id: string; title: string } | null>(null);
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);

  const fetchNotes = async () => {
    try {
      const res = await api.get('/notes');
      if (res.data.success) {
        setNotes(res.data.notes || []);
      }
    } catch {
      toast('Failed to load notes', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const handleDelete = async () => {
    if (!deleteNoteId) return;
    try {
      await api.delete(`/notes/${deleteNoteId}`);
      toast('Note cleared successfully', 'info');
      setDeleteNoteId(null);
      fetchNotes();
    } catch {
      toast('Failed to delete note', 'error');
    }
  };

  const filteredNotes = notes.filter((n) => {
    const topic = typeof n.topicId === 'object' ? n.topicId : null;
    const sub = typeof n.subjectId === 'object' ? n.subjectId : null;
    const titleMatch = topic?.title?.toLowerCase().includes(search.toLowerCase());
    const subMatch = sub?.name?.toLowerCase().includes(search.toLowerCase());
    const contentMatch = n.content.toLowerCase().includes(search.toLowerCase());
    return titleMatch || subMatch || contentMatch;
  });

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Topic Revision Notes
          </h1>
          <p className="text-xs text-slate-500">
            Rich-text notes, key formulas and revision takeaways across all subjects
          </p>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            placeholder="Search notes content or topics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-8 bg-white/50 dark:bg-slate-900/50">
          <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            No revision notes found
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Open any topic in your subjects and click &quot;Add Notes&quot; to write rich-text summaries and key points.
          </p>
          <Link
            to="/subjects"
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md transition"
          >
            <BookOpen className="w-4 h-4" /> Go to Subjects
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredNotes.map((note) => {
            const topic = typeof note.topicId === 'object' ? note.topicId : null;
            const sub = typeof note.subjectId === 'object' ? note.subjectId : null;
            const plainText = note.content.replace(/<[^>]*>?/gm, '').trim();

            return (
              <div
                key={note._id}
                className="group flex flex-col justify-between p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs hover:shadow-md transition-all duration-200"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md truncate max-w-[150px]"
                      style={{
                        backgroundColor: `${sub?.color || '#3B82F6'}15`,
                        color: sub?.color || '#3B82F6'
                      }}
                    >
                      {sub?.name || 'Subject'}
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3" />
                      {new Date(note.updatedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {topic?.title || 'Untitled Topic'}
                  </h3>

                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-4 mt-2 font-mono bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
                    {plainText || 'No text written...'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <Link
                    to={topic?._id ? `/topics/${topic._id}/notes` : '#'}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Open Editor</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => setDeleteNoteId(note._id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                    title="Clear Note"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Editor Modal */}
      {activeTopic && (
        <RevisionNotesModal
          isOpen={!!activeTopic}
          topicId={activeTopic.id}
          topicTitle={activeTopic.title}
          onClose={() => setActiveTopic(null)}
          onSaved={fetchNotes}
        />
      )}

      {/* Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteNoteId}
        title="Clear Revision Note?"
        message="Are you sure you want to clear this topic's notes? The topic itself and all materials will remain untouched."
        confirmLabel="Clear Note"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteNoteId(null)}
      />
    </div>
  );
};
