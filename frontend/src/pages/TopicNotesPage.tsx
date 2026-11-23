import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import LinkExtension from '@tiptap/extension-link';
import ImageExtension from '@tiptap/extension-image';
import {
  ArrowLeft,
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
  Sparkles,
  BookOpen,
  ImageIcon
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { PromptModal } from '../components/common/PromptModal';
import { AiNoteGeneratorModal } from '../components/notes/AiNoteGeneratorModal';

export const TopicNotesPage: React.FC = () => {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [topic, setTopic] = useState<any>(null);
  const [noteId, setNoteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [imagePromptOpen, setImagePromptOpen] = useState(false);
  const [aiGeneratorOpen, setAiGeneratorOpen] = useState(false);
  const autoSaveTimerRef = useRef<any>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      LinkExtension.configure({
        openOnClick: true,
        autolink: true
      }),
      ImageExtension.configure({
        allowBase64: true,
        inline: true
      })
    ],
    content: '',
    onUpdate: ({ editor }) => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      autoSaveTimerRef.current = setTimeout(() => {
        saveNote(editor.getHTML(), true);
      }, 1500);
    }
  });

  useEffect(() => {
    if (!topicId) return;

    const fetchTopicAndNote = async () => {
      setLoading(true);
      try {
        // Fetch note
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
          if (res.data.note.topicId) {
            setTopic(res.data.note.topicId);
          }
        }
      } catch (err: any) {
        console.error('Failed to load topic note:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTopicAndNote();

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [topicId, editor]);

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
    } catch {
      toast('Failed to delete note', 'error');
    }
  };

  const topicTitle = topic?.title || 'Topic Revision Notes';

  return (
    <div className="max-w-5xl mx-auto space-y-4 pb-12 animate-in fade-in">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition shrink-0"
            title="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider font-bold text-blue-600 dark:text-blue-400">
                Revision Notes
              </span>
              {lastSaved && (
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-500" /> Saved {lastSaved}
                </span>
              )}
              {saving && (
                <span className="text-[11px] text-amber-500 animate-pulse">Auto-saving...</span>
              )}
            </div>
            <h1 className="font-extrabold text-lg sm:text-xl text-slate-900 dark:text-white truncate">
              {topicTitle}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setAiGeneratorOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-xs"
            title="Generate notes with AI"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>AI Notes</span>
          </button>

          <button
            type="button"
            onClick={() => saveNote()}
            disabled={saving}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-xs disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>Save</span>
          </button>

          {noteId && (
            <button
              type="button"
              onClick={() => setDeleteConfirmOpen(true)}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition"
              title="Clear note"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Editor Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden flex flex-col min-h-[65vh]">
        {/* Formatting Toolbar */}
        {editor && (
          <div className="flex flex-wrap items-center gap-1 px-4 py-2 bg-slate-100/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 backdrop-blur-md">
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-2 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition ${
                editor.isActive('bold') ? 'bg-white dark:bg-slate-700 shadow-xs text-blue-600' : 'text-slate-600 dark:text-slate-300'
              }`}
              title="Bold"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-2 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition ${
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
              className={`p-2 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition ${
                editor.isActive('heading', { level: 1 }) ? 'bg-white dark:bg-slate-700 shadow-xs text-blue-600' : 'text-slate-600 dark:text-slate-300'
              }`}
              title="Heading 1"
            >
              <Heading1 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`p-2 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition ${
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
              className={`p-2 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition ${
                editor.isActive('bulletList') ? 'bg-white dark:bg-slate-700 shadow-xs text-blue-600' : 'text-slate-600 dark:text-slate-300'
              }`}
              title="Bullet List"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`p-2 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition ${
                editor.isActive('orderedList') ? 'bg-white dark:bg-slate-700 shadow-xs text-blue-600' : 'text-slate-600 dark:text-slate-300'
              }`}
              title="Numbered List"
            >
              <ListOrdered className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              className={`p-2 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition ${
                editor.isActive('codeBlock') ? 'bg-white dark:bg-slate-700 shadow-xs text-blue-600' : 'text-slate-600 dark:text-slate-300'
              }`}
              title="Code Block"
            >
              <Code className="w-4 h-4" />
            </button>
            <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-700 mx-1" />
            <button
              type="button"
              onClick={() => {
                setImagePromptOpen(true);
              }}
              className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition text-slate-600 dark:text-slate-300"
              title="Insert Image by URL"
            >
              <ImageIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Editor Body */}
        <div className="flex-1 p-5 sm:p-8 bg-white dark:bg-slate-900 focus-within:ring-0">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-slate-400">
              Loading note content...
            </div>
          ) : (
            <EditorContent
              editor={editor}
              className="study-notes-content max-w-none min-h-[380px] outline-hidden focus:outline-hidden text-slate-800 dark:text-slate-200"
            />
          )}
        </div>
      </div>

      {/* Confirmation & AI Modals */}
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
    </div>
  );
};
