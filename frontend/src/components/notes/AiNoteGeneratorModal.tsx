import React, { useState } from 'react';
import {
  Sparkles,
  X,
  FileText,
  Sliders,
  Check,
  RotateCw,
  Copy,
  BookOpen,
  ArrowRight,
  HelpCircle
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

interface AiNoteGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  topicTitle: string;
  onInsertNote: (htmlContent: string, mode: 'replace' | 'append') => void;
}

type ExamPreset = '16-mark' | '8-mark' | '2-mark' | 'custom';

export const AiNoteGeneratorModal: React.FC<AiNoteGeneratorModalProps> = ({
  isOpen,
  onClose,
  topicTitle,
  onInsertNote
}) => {
  const { toast } = useToast();
  const [preset, setPreset] = useState<ExamPreset>('16-mark');
  const [specification, setSpecification] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  if (!isOpen) return null;

  const presetsConfig: {
    id: ExamPreset;
    title: string;
    marks: string;
    desc: string;
    badgeColor: string;
  }[] = [
    {
      id: '16-mark',
      title: '16-Mark Detailed Answer',
      marks: '16M',
      desc: 'Intro, Architecture, In-depth Subtopics, Working Mechanisms, Formulas/Code, Advantages & Summary',
      badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200 border-purple-300 dark:border-purple-700'
    },
    {
      id: '8-mark',
      title: '8-Mark Concept Note',
      marks: '8M',
      desc: 'Balanced core answer with structured sub-headings, key mechanisms, and diagrams workflow',
      badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 border-blue-300 dark:border-blue-700'
    },
    {
      id: '2-mark',
      title: '2-Mark Short & Exact',
      marks: '2M',
      desc: 'Crisp 1-2 sentence definition, key formula/rule, and essential high-yield keywords',
      badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
    },
    {
      id: 'custom',
      title: 'Custom Specification',
      marks: 'Custom',
      desc: 'Follow your exact prompt criteria and custom subtopics structure',
      badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 border-amber-300 dark:border-amber-700'
    }
  ];

  const handleGenerate = async () => {
    setLoading(true);
    setGeneratedHtml(null);
    setSummary(null);

    try {
      const res = await api.post('/ai/generate-notes', {
        topicTitle,
        preset,
        specification: specification.trim() || undefined,
        sourceText: sourceText.trim() || undefined
      });

      if (res.data.success && res.data.htmlContent) {
        setGeneratedHtml(res.data.htmlContent);
        setSummary(res.data.summary || `Generated ${preset} notes successfully.`);
        toast('Notes generated with AI!', 'success');
      } else {
        toast(res.data.message || 'Failed to generate notes', 'error');
      }
    } catch (err: any) {
      toast(err.response?.data?.message || err.message || 'Generation failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = (mode: 'replace' | 'append') => {
    if (!generatedHtml) return;
    onInsertNote(generatedHtml, mode);
    toast(mode === 'replace' ? 'Note updated with AI notes' : 'AI notes appended', 'success');
    onClose();
  };

  const handleCopy = () => {
    if (!generatedHtml) return;
    // Strip tags for clean text clipboard or copy html directly
    const tempEl = document.createElement('div');
    tempEl.innerHTML = generatedHtml;
    navigator.clipboard.writeText(tempEl.innerText || generatedHtml);
    toast('Copied note text to clipboard', 'info');
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-3xl max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-tr from-purple-500 to-blue-600 rounded-xl text-white shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <span>AI Note Generator & Noise Cleaner</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-md">
                Topic: <strong className="text-slate-700 dark:text-slate-200">{topicTitle}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Step 1: Preset Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2.5 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-blue-500" />
              <span>Step 1: Choose Exam Format Preset</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {presetsConfig.map((p) => {
                const isSelected = preset === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setPreset(p.id)}
                    className={`cursor-pointer p-3.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 ring-2 ring-blue-500/30 shadow-xs'
                        : 'border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 bg-slate-50/60 dark:bg-slate-900/80 hover:bg-white dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`font-semibold text-sm ${isSelected ? 'text-blue-700 dark:text-blue-400' : 'text-slate-900 dark:text-slate-100'}`}>
                        {p.title}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${p.badgeColor}`}>
                        {p.marks}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                      {p.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 2: Custom Specifications & Subtopics */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex flex-wrap items-center justify-between gap-1">
              <span className="flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-purple-500" />
                <span>Step 2: Specific Subtopics or Instructions (Optional)</span>
              </span>
              <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 lowercase">e.g. mention sliding window types, go-back-n</span>
            </label>
            <input
              type="text"
              value={specification}
              onChange={(e) => setSpecification(e.target.value)}
              placeholder="e.g. Include specific subtopics: Frame format, Bit stuffing, Flow control & 16-mark university questions"
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>

          {/* Step 3: Raw Notes Text / Noise Cleaner */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex flex-wrap items-center justify-between gap-1">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-500" />
                <span>Step 3: Paste Raw Notes / ChatGPT Output (Noise Filter)</span>
              </span>
              <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 lowercase">optional - leave empty to generate from scratch</span>
            </label>
            <textarea
              rows={4}
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="Paste messy ChatGPT chat, raw lecture notes, or web articles here... AI will strip conversational fluff, extract key technical points, and organize them into the selected format."
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-mono"
            />
          </div>

          {/* Action Button */}
          <div>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 shadow-md transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Synthesizing Exam Notes with Groq AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Clean {preset.toUpperCase()} Notes</span>
                </>
              )}
            </button>
          </div>

          {/* Generated Result Preview */}
          {generatedHtml && (
            <div className="border border-purple-200 dark:border-purple-900/50 bg-purple-50/30 dark:bg-purple-950/20 rounded-2xl p-4 sm:p-5 space-y-3.5 animate-in fade-in">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-200/60 dark:border-purple-800/40 pb-3">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                    Preview Generated Revision Notes
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Text</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApply('append')}
                    className="flex items-center gap-1 px-3 py-1 text-xs font-medium bg-slate-700 hover:bg-slate-800 text-white rounded-lg transition"
                  >
                    <span>Append</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApply('replace')}
                    className="flex items-center gap-1 px-3 py-1 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition shadow-xs"
                  >
                    <span>Replace Entire Note</span>
                  </button>
                </div>
              </div>

              {/* Rendered HTML snippet preview */}
              <div
                className="max-h-72 overflow-y-auto p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 prose prose-sm dark:prose-invert max-w-none text-slate-800 dark:text-slate-200"
                dangerouslySetInnerHTML={{ __html: generatedHtml }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
