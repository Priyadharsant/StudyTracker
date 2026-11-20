import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import {
  BookOpen,
  CheckCircle2,
  Circle,
  FileText,
  ExternalLink,
  Search,
  Sparkles,
  RotateCcw,
  Layers,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Calendar,
  Eye,
  FileDown
} from 'lucide-react';
import api from '../services/api';

interface SharedTopic {
  _id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  deadline?: string | null;
  order: number;
  materials?: Array<{
    _id: string;
    type: 'URL' | 'FILE';
    title: string;
    description?: string;
    url?: string;
    mimeType?: string;
    fileSize?: number;
  }>;
  notes?: Array<{
    _id: string;
    content: string;
  }>;
}

interface SharedUnit {
  _id: string;
  name: string;
  description?: string;
  order: number;
  materials?: Array<{
    _id: string;
    type: 'URL' | 'FILE';
    title: string;
    description?: string;
    url?: string;
    mimeType?: string;
    fileSize?: number;
  }>;
  topics: SharedTopic[];
}

interface SharedSubject {
  _id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  shareCode: string;
}

export const SharedSubjectPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subject, setSubject] = useState<SharedSubject | null>(null);
  const [units, setUnits] = useState<SharedUnit[]>([]);

  // Local storage cache key for this shared subject
  const cacheKey = `studytrack_shared_progress_${code}`;

  // Checked topic IDs saved in local storage cache
  const [checkedTopicIds, setCheckedTopicIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(`studytrack_shared_progress_${code}`);
      return stored ? new Set(JSON.parse(stored)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  // Collapsed unit state
  const [collapsedUnits, setCollapsedUnits] = useState<Record<string, boolean>>({});
  const [activeNotesTopic, setActiveNotesTopic] = useState<SharedTopic | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!code) return;

    api
      .get(`/subjects/shared/${code}`)
      .then((res) => {
        if (res.data.success) {
          setSubject(res.data.subject);
          setUnits(res.data.units || []);

          // Read only from the viewer's local browser cache; otherwise default to completely unchecked
          try {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
              setCheckedTopicIds(new Set(JSON.parse(cached)));
            } else {
              setCheckedTopicIds(new Set<string>());
            }
          } catch {
            setCheckedTopicIds(new Set<string>());
          }
        } else {
          setError(res.data.message || 'Failed to load shared subject');
        }
      })
      .catch((err) => {
        setError(
          err.response?.data?.message ||
            'This shared subject is either private, expired, or does not exist.'
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [code]);

  // Persist checked state to browser localStorage cache
  const toggleTopicCheck = (topicId: string) => {
    setCheckedTopicIds((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) {
        next.delete(topicId);
      } else {
        next.add(topicId);
      }
      try {
        localStorage.setItem(cacheKey, JSON.stringify(Array.from(next)));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Reset local cache progress
  const handleResetLocalProgress = () => {
    setCheckedTopicIds(new Set());
    try {
      localStorage.removeItem(cacheKey);
    } catch {
      // ignore
    }
    setResetConfirmOpen(false);
  };

  const toggleUnitCollapse = (unitId: string) => {
    setCollapsedUnits((prev) => ({ ...prev, [unitId]: !prev[unitId] }));
  };

  // Calculate statistics
  const allTopics = units.flatMap((u) => u.topics);
  const totalTopics = allTopics.length;
  const completedTopics = allTopics.filter((t) => checkedTopicIds.has(t._id)).length;
  const progressPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-500">Loading shared subject syllabus...</p>
      </div>
    );
  }

  if (error || !subject) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            Shared Subject Unavailable
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            {error || 'This syllabus link is invalid or has been disabled by the author.'}
          </p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
          >
            Go to StudyTrack Homepage
          </Link>
        </div>
      </div>
    );
  }

  // Filter topics by search query
  const filteredUnits = units.map((unit) => {
    const matchingTopics = unit.topics.filter(
      (t) =>
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(search.toLowerCase()))
    );
    return { ...unit, topics: matchingTopics };
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xs">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight">StudyTrack</span>
              <span className="ml-2 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                Shared Syllabus
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/register"
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition"
            >
              Create Free Account
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Banner with local cache alert */}
        <div className="flex items-start sm:items-center justify-between gap-3 p-3.5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 rounded-2xl text-xs">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <p className="text-slate-700 dark:text-slate-300">
              <strong>Interactive Read-Only View:</strong> You can check off topics as you study. Your progress is saved privately in your <strong>browser's local cache</strong>.
            </p>
          </div>
          {completedTopics > 0 && (
            <button
              onClick={() => setResetConfirmOpen(true)}
              className="shrink-0 flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 transition"
              title="Reset your local checklist checkmarks"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset my checklist</span>
            </button>
          )}
        </div>

        {/* Subject Header Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-xs"
                style={{
                  backgroundColor: `${subject.color}20`,
                  color: subject.color
                }}
              >
                <BookOpen className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {subject.name}
                </h1>
                {subject.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                    {subject.description}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1 font-medium">
                    <Layers className="w-3.5 h-3.5 text-blue-500" />
                    {units.length} {units.length === 1 ? 'Unit' : 'Units'}
                  </span>
                  <span>•</span>
                  <span>
                    {totalTopics} Total Topics
                  </span>
                </div>
              </div>
            </div>

            {/* Progress Card */}
            <div className="sm:text-right bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 min-w-[180px]">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Your Checklist Progress
              </div>
              <div className="text-2xl font-black mt-1 text-slate-900 dark:text-white">
                {progressPercent}%
              </div>
              <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${progressPercent}%`,
                    backgroundColor: subject.color || '#3B82F6'
                  }}
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {completedTopics} of {totalTopics} completed
              </p>
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search topics in this syllabus..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Units and Topics List */}
        <div className="space-y-4">
          {filteredUnits.length === 0 ? (
            <div className="py-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
              <p className="text-xs text-slate-400">No topics match your search criteria.</p>
            </div>
          ) : (
            filteredUnits.map((unit) => {
              const isCollapsed = collapsedUnits[unit._id];
              const unitTotal = unit.topics.length;
              const unitCompleted = unit.topics.filter((t) => checkedTopicIds.has(t._id)).length;
              const unitPercent =
                unitTotal > 0 ? Math.round((unitCompleted / unitTotal) * 100) : 0;

              return (
                <div
                  key={unit._id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs transition"
                >
                  {/* Unit Header */}
                  <div
                    onClick={() => toggleUnitCollapse(unit._id)}
                    className="p-3.5 sm:p-4 cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/40 select-none transition"
                  >
                    {/* First line: collapse icon, full unit title */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                        <button className="text-slate-400 shrink-0">
                          {isCollapsed ? (
                            <ChevronRight className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white break-words">
                            {unit.name}
                          </h3>
                          {unit.description && (
                            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                              {unit.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Desktop progress counter */}
                      <div className="hidden sm:flex items-center gap-3 shrink-0">
                        <span className="text-xs font-semibold text-slate-500">
                          {unitCompleted}/{unitTotal}
                        </span>
                        <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full transition-all"
                            style={{ width: `${unitPercent}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-slate-500 w-8 text-right">
                          {unitPercent}%
                        </span>
                      </div>
                    </div>

                    {/* Mobile second line: progress bar and unit material count */}
                    <div className="flex sm:hidden items-center justify-between gap-2 pt-2 mt-2 border-t border-slate-100 dark:border-slate-800/60">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                          {unitCompleted}/{unitTotal}
                        </span>
                        <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden max-w-[120px]">
                          <div
                            className="h-full bg-blue-600 rounded-full transition-all"
                            style={{ width: `${unitPercent}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-500">
                          {unitPercent}%
                        </span>
                      </div>

                      {unit.materials && unit.materials.length > 0 && (
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md">
                          {unit.materials.length} Materials
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Topics List */}
                  {!isCollapsed && (
                    <div className="border-t border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/60">
                      {/* Unit Level Materials in Shared View */}
                      {unit.materials && unit.materials.length > 0 && (
                        <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/20 border-b border-indigo-100 dark:border-indigo-900/30">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 block mb-2">
                            Unit Materials ({unit.materials.length}):
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {unit.materials.map((mat) => (
                              <a
                                key={mat._id}
                                href={mat.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-2xs transition"
                              >
                                <ExternalLink className="w-3.5 h-3.5 text-indigo-500" />
                                <span>{mat.title}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {unit.topics.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400">
                          No topics in this unit.
                        </div>
                      ) : (
                        unit.topics.map((topic) => {
                          const isChecked = checkedTopicIds.has(topic._id);
                          return (
                            <div
                              key={topic._id}
                              className={`p-3.5 sm:px-5 flex items-start gap-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition ${
                                isChecked ? 'bg-slate-50/30 dark:bg-slate-900/40 opacity-75' : ''
                              }`}
                            >
                              {/* Checkbox */}
                              <button
                                type="button"
                                onClick={() => toggleTopicCheck(topic._id)}
                                className="mt-0.5 text-slate-300 dark:text-slate-700 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer"
                                title={isChecked ? 'Mark pending' : 'Mark completed in local cache'}
                              >
                                {isChecked ? (
                                  <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-50 dark:fill-emerald-950/40" />
                                ) : (
                                  <Circle className="w-5 h-5" />
                                )}
                              </button>

                              {/* Topic Details */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4
                                    className={`text-xs font-semibold text-slate-900 dark:text-slate-100 ${
                                      isChecked ? 'line-through text-slate-400 dark:text-slate-500' : ''
                                    }`}
                                  >
                                    {topic.title}
                                  </h4>

                                  {/* Priority Badge */}
                                  <span
                                    className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${
                                      topic.priority === 'high'
                                        ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
                                        : topic.priority === 'medium'
                                        ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                    }`}
                                  >
                                    {topic.priority}
                                  </span>

                                  {topic.deadline && (
                                    <span className="flex items-center gap-1 text-[10px] text-slate-400">
                                      <Calendar className="w-3 h-3" />
                                      {new Date(topic.deadline).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>

                                {topic.description && (
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                    {topic.description}
                                  </p>
                                )}

                                {/* Materials & Notes Attachments */}
                                {((topic.materials && topic.materials.length > 0) ||
                                  (topic.notes && topic.notes.length > 0)) && (
                                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    {/* Attached Materials */}
                                    {topic.materials?.map((mat) => (
                                      <a
                                        key={mat._id}
                                        href={mat.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 hover:underline font-medium border border-blue-200/50 dark:border-blue-900/50"
                                      >
                                        <span>{mat.title}</span>
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    ))}

                                    {/* Attached Revision Notes */}
                                    {topic.notes && topic.notes.length > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => setActiveNotesTopic(topic)}
                                        className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40 font-medium border border-emerald-200/50 dark:border-emerald-900/50 transition cursor-pointer"
                                      >
                                        <FileText className="w-3 h-3" />
                                        <span>View Revision Note</span>
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Revision Note Modal (Read-Only) */}
      {activeNotesTopic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-500" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Revision Note: {activeNotesTopic.title}
                </h3>
              </div>
              <button
                onClick={() => setActiveNotesTopic(null)}
                className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-2 py-1"
              >
                Close
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex-1 prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed">
              {activeNotesTopic.notes && activeNotesTopic.notes.length > 0 ? (
                <div
                  dangerouslySetInnerHTML={{
                    __html: activeNotesTopic.notes[0].content || '<p>No content in this note.</p>'
                  }}
                />
              ) : (
                <p className="text-slate-400">No notes attached.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <ConfirmDialog
        isOpen={resetConfirmOpen}
        title="Reset Local Checklist Progress?"
        message="This will clear your local checkmarks for this shared subject in this browser."
        confirmLabel="Reset Progress"
        onConfirm={handleResetLocalProgress}
        onCancel={() => setResetConfirmOpen(false)}
      />

      <footer className="mt-auto py-6 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
        <p>Powered by StudyTrack – Smart Syllabus & Checklist Tracker</p>
      </footer>
    </div>
  );
};
