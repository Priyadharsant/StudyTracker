import React from 'react';
import {
  Sparkles,
  FileCode,
  Layers,
  BookOpen,
  X
} from 'lucide-react';

interface CreationChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  onSelectAi: () => void;
  onSelectJson: () => void;
  onSelectManual: () => void;
  manualLabel?: string;
  manualDesc?: string;
}

export const CreationChoiceModal: React.FC<CreationChoiceModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  onSelectAi,
  onSelectJson,
  onSelectManual,
  manualLabel = 'Create Manually',
  manualDesc = 'Add details, custom units and topics by filling out a standard form.'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">
              {title}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 mt-5">
          {/* Option 1: AI */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onSelectAi();
            }}
            className="w-full flex items-start gap-4 p-4 rounded-2xl border border-purple-200 dark:border-purple-900/50 bg-linear-to-r from-purple-50/70 to-indigo-50/70 dark:from-purple-950/20 dark:to-indigo-950/20 hover:border-purple-400 dark:hover:border-purple-700 text-left transition group shadow-xs"
          >
            <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-sm group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900 dark:text-white">
                  Create with AI
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                  Recommended
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Paste syllabus, notes, or chat messages. AI auto-extracts units and topics in seconds.
              </p>
            </div>
          </button>

          {/* Option 2: JSON */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onSelectJson();
            }}
            className="w-full flex items-start gap-4 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/60 text-left transition group"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0 group-hover:scale-105 transition-transform">
              <FileCode className="w-5 h-5 text-indigo-500" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-sm text-slate-900 dark:text-white">
                Create by JSON
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Import from structured JSON template or export from another course.
              </p>
            </div>
          </button>

          {/* Option 3: Manual */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onSelectManual();
            }}
            className="w-full flex items-start gap-4 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/60 text-left transition group"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0 group-hover:scale-105 transition-transform">
              <Layers className="w-5 h-5 text-blue-500" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-sm text-slate-900 dark:text-white">
                {manualLabel}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {manualDesc}
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
