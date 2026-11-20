import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Code,
  Save,
  Check,
  Trash2,
  X,
  Sparkles
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { AiNoteGeneratorModal } from './AiNoteGeneratorModal';

interface RevisionNotesModalProps {
  topicId: string;
  topicTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const RevisionNotesModal: React.FC<RevisionNotesModalProps> = ({
  topicId,
  topicTitle,
  isOpen,
  onClose,
  onSaved
}) => {
  const { toast } = useToast();
  const [noteId, setNoteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [aiGeneratorOpen, setAiGeneratorOpen] = useState(false);
  const autoSaveTimerRef = useRef<any>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: true,
        autolink: true
      })
    ],
    content: '',
    onUpdate: ({ editor }) => {
      // Trigger debounce auto-save after 1.5 seconds of inactivity
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      autoSaveTimerRef.current = setTimeout(() => {
        saveNote(editor.getHTML(), true);
      }, 1500);
    }
  });

  useEffect(() => {
    if (!isOpen || !topicId) return;

    const fetchNote = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/topics/${topicId}/notes`);
        if (res.data.success && res.data.note) {
          setNoteId(res.data.note._id);
          const content = res.data.note.content || '';
          if (editor && editor.getHTML() !== content) {
            editor.commands.setContent(content);
          }
          if (res.data.note.updatedAt) {
            setLastSaved(new Date(res.data.note.updatedAt).toLocaleTimeString());
          }
        }
      } catch (err: any) {
        toast('Failed to load notes', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchNote();

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [isOpen, topicId, editor]);

  const saveNote = async (contentToSave?: string, isAuto = false) => {
    if (!editor || !topicId) return;
    const content = contentToSave !== undefined ? contentToSave : editor.getHTML();

    setSaving(true);
    try {
      const res = await api.post(`/topics/${topicId}/notes`, { content });
      if (res.data.success) {
        setNoteId(res.data.note._id);
        setLastSaved(new Date().toLocaleTimeString());
        if (!isAuto) {
          toast('Notes saved successfully', 'success');
        }
        if (onSaved) onSaved();
      }
    } catch {
      if (!isAuto) toast('Failed to save note', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleInsertAiNote = (htmlContent: string, mode: 'replace' | 'append') => {
    if (!editor) return;
    if (mode === 'replace') {
      editor.commands.setContent(htmlContent);
    } else {
      const current = editor.getHTML();
      editor.commands.setContent(`${current}<hr/>${htmlContent}`);
    }
    // Auto-save after inserting
    saveNote(editor.getHTML(), false);
  };

  const handleDelete = async () => {
    if (!noteId) return;
    try {
      await api.delete(`/notes/${noteId}`);
      if (editor) editor.commands.setContent('');
      setLastSaved(null);
      toast('Note cleared', 'info');
      setDeleteConfirmOpen(false);
      if (onSaved) onSaved();
    } catch {
      toast('Failed to delete note', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in">
        <div className="w-full max-w-4xl h-[85vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-bold text-blue-600 dark:text-blue-400">
                  Revision Notes
                </span>
                {lastSaved && (
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-500" /> Saved {lastSaved}
                  </span>
                )}
                {saving && (
                  <span className="text-xs text-amber-500 animate-pulse">Auto-saving...</span>
                )}
              </div>
              <h3 className="font-semibold text-lg text-slate-900 dark:text-white truncate">
                {topicTitle}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAiGeneratorOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg text-sm font-medium transition shadow-xs"
                title="Generate or polish notes with AI"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span className="hidden sm:inline">AI Notes</span>
              </button>
              <button
                type="button"
                onClick={() => saveNote()}
                disabled={saving}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow-xs disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>Save</span>
              </button>
              {noteId && (
                <button
                  type="button"
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                  title="Clear note"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Formatting Toolbar */}
          {editor && (
            <div className="flex flex-wrap items-center gap-1 px-4 py-2 bg-slate-100/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={`p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 transition ${
                  editor.isActive('bold') ? 'bg-white dark:bg-slate-700 shadow-xs text-blue-600' : 'text-slate-600 dark:text-slate-300'
                }`}
                title="Bold"
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 transition ${
                  editor.isActive('italic') ? 'bg-white dark:bg-slate-700 shadow-xs text-blue-600' : 'text-slate-600 dark:text-slate-300'
                }`}
                title="Italic"
              >
                <Italic className="w-4 h-4" />
              </button>
              <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-700 mx-1" />
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                className={`p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 transition ${
                  editor.isActive('heading', { level: 1 }) ? 'bg-white dark:bg-slate-700 shadow-xs text-blue-600' : 'text-slate-600 dark:text-slate-300'
                }`}
                title="Heading 1"
              >
                <Heading1 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={`p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 transition ${
                  editor.isActive('heading', { level: 2 }) ? 'bg-white dark:bg-slate-700 shadow-xs text-blue-600' : 'text-slate-600 dark:text-slate-300'
                }`}
                title="Heading 2"
              >
                <Heading2 className="w-4 h-4" />
              </button>
              <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-700 mx-1" />
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={`p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 transition ${
                  editor.isActive('bulletList') ? 'bg-white dark:bg-slate-700 shadow-xs text-blue-600' : 'text-slate-600 dark:text-slate-300'
                }`}
                title="Bullet List"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={`p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 transition ${
                  editor.isActive('orderedList') ? 'bg-white dark:bg-slate-700 shadow-xs text-blue-600' : 'text-slate-600 dark:text-slate-300'
                }`}
                title="Numbered List"
              >
                <ListOrdered className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                className={`p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 transition ${
                  editor.isActive('codeBlock') ? 'bg-white dark:bg-slate-700 shadow-xs text-blue-600' : 'text-slate-600 dark:text-slate-300'
                }`}
                title="Code Block"
              >
                <Code className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Editor Body */}
          <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-slate-900 focus-within:ring-0">
            {loading ? (
              <div className="flex items-center justify-center h-48 text-slate-400">
                Loading notes...
              </div>
            ) : (
              <EditorContent
                editor={editor}
                className="prose dark:prose-invert max-w-none min-h-[300px] outline-hidden focus:outline-hidden"
              />
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        title="Clear Revision Note?"
        message="Are you sure you want to delete all notes for this topic? This cannot be undone."
        confirmLabel="Clear Note"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
      />

      <AiNoteGeneratorModal
        isOpen={aiGeneratorOpen}
        onClose={() => setAiGeneratorOpen(false)}
        topicTitle={topicTitle}
        onInsertNote={handleInsertAiNote}
      />
    </>
  );
};
