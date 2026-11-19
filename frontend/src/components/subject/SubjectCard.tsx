import React from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Code,
  Atom,
  Calculator,
  Compass,
  Cpu,
  Database,
  Globe,
  MoreVertical,
  Trash2,
  Edit2,
  Copy,
  RotateCcw,
  Share2
} from 'lucide-react';
import { Subject } from '../../types';

interface SubjectCardProps {
  subject: Subject;
  onEdit: (subject: Subject) => void;
  onDuplicate: (id: string) => void;
  onReset: (id: string) => void;
  onDelete: (id: string) => void;
  onShare?: (subject: Subject) => void;
}

const iconMap: Record<string, any> = {
  BookOpen,
  Code,
  Atom,
  Calculator,
  Compass,
  Cpu,
  Database,
  Globe
};

export const SubjectCard: React.FC<SubjectCardProps> = ({
  subject,
  onEdit,
  onDuplicate,
  onReset,
  onDelete,
  onShare
}) => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const IconComponent = iconMap[subject.icon] || BookOpen;

  const total = subject.totalTopics || 0;
  const completed = subject.completedTopics || 0;
  const percent = subject.progressPercentage || (total > 0 ? Math.round((completed / total) * 100) : 0);

  return (
    <div className="relative group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between">
      {/* Top row */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <Link
            to={`/subjects/${subject._id}`}
            className="flex items-center gap-3 flex-1 min-w-0"
          >
            <div
              className="p-3 rounded-xl shrink-0 transition-transform group-hover:scale-105"
              style={{
                backgroundColor: `${subject.color}18`,
                color: subject.color
              }}
            >
              <IconComponent className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 break-words">
                {subject.name}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {total} {total === 1 ? 'Topic' : 'Topics'} total
              </p>
            </div>
          </Link>

          {/* Options Menu */}
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
                className="absolute right-0 mt-1 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-20 py-1 text-xs animate-in fade-in"
                onMouseLeave={() => setMenuOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); onEdit(subject); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Edit2 className="w-3.5 h-3.5 text-blue-500" />
                  <span>Edit Subject</span>
                </button>

                {onShare && (
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); onShare(subject); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Share2 className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Share Subject</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); onDuplicate(subject._id); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Copy className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Duplicate Subject</span>
                </button>

                {completed > 0 && (
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); onReset(subject._id); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
                    <span>Reset Progress</span>
                  </button>
                )}

                <div className="h-[1px] bg-slate-100 dark:bg-slate-800 my-1" />

                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); onDelete(subject._id); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Subject</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {subject.description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">
            {subject.description}
          </p>
        )}
      </div>

      {/* Progress bar and open link */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80">
        <div className="flex justify-between items-center text-xs mb-1.5 font-medium">
          <span className="text-slate-500 dark:text-slate-400">
            {completed} of {total} completed
          </span>
          <span className="font-bold text-slate-700 dark:text-slate-200">
            {percent}%
          </span>
        </div>

        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${percent}%`,
              backgroundColor: subject.color || '#3B82F6'
            }}
          />
        </div>

        <Link
          to={`/subjects/${subject._id}`}
          className="mt-3 block text-center py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-50 dark:bg-slate-800/50 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl transition"
        >
          View Checklist & Topics &rarr;
        </Link>
      </div>
    </div>
  );
};
