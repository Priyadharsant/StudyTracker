import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search as SearchIcon,
  BookOpen,
  Folder,
  CheckCircle2,
  Square,
  FileText,
  Link as LinkIcon,
  ExternalLink,
  Eye,
  Filter,
  Sparkles,
  Bot,
  Loader2
} from 'lucide-react';
import api from '../services/api';
import { Subject, Unit, Topic, Material, Note } from '../types';
import { DocumentViewerModal } from '../components/common/DocumentViewerModal';
import { RevisionNotesModal } from '../components/notes/RevisionNotesModal';

export const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');

  const [subjectsList, setSubjectsList] = useState<Subject[]>([]);
  const [aiInsight, setAiInsight] = useState<{ summary?: string; suggestedAction?: string } | null>(null);
  const [aiSearching, setAiSearching] = useState(false);
  const [results, setResults] = useState<{
    subjects: Subject[];
    units: Unit[];
    topics: Topic[];
    notes: Note[];
    materials: Material[];
  }>({
    subjects: [],
    units: [],
    topics: [],
    notes: [],
    materials: []
  });
  const [loading, setLoading] = useState(false);

  // Modals for viewer and notes
  const [viewerMaterial, setViewerMaterial] = useState<Material | null>(null);
  const [noteTopic, setNoteTopic] = useState<{ id: string; title: string } | null>(null);

  // Load user subjects for filter dropdown
  useEffect(() => {
    api.get('/subjects').then((res) => {
      if (res.data.success) setSubjectsList(res.data.subjects || []);
    });
  }, []);

  // Debounce search input (350ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 350);
    return () => clearTimeout(handler);
  }, [query]);

  // Main unified search handler:
  // 1. Instantly queries backend database for immediate results
  // 2. Concurrently calls AI Smart Search with skeleton preview box
  const executeSearch = async (searchQuery: string, subjectIdFilter?: string, statusFilterVal?: string) => {
    const q = searchQuery.trim();
    if (!q && (!statusFilterVal || statusFilterVal === 'all') && !subjectIdFilter) {
      setResults({ subjects: [], units: [], topics: [], notes: [], materials: [] });
      setAiInsight(null);
      return;
    }

    setLoading(true);
    setAiSearching(true);
    setAiInsight(null);

    // 1. Instant Backend Search
    try {
      const params: any = {};
      if (q) params.q = q;
      if (statusFilterVal && statusFilterVal !== 'all') params.status = statusFilterVal;
      if (subjectIdFilter) params.subjectId = subjectIdFilter;

      const backendRes = await api.get('/search', { params });
      if (backendRes.data.success) {
        setResults({
          subjects: backendRes.data.subjects || [],
          units: backendRes.data.units || [],
          topics: backendRes.data.topics || [],
          notes: backendRes.data.notes || [],
          materials: backendRes.data.materials || []
        });
      }
    } catch (err) {
      console.error('Instant search error:', err);
    } finally {
      setLoading(false);
    }

    // 2. Concurrently fetch AI Insights (if query provided)
    if (q) {
      try {
        const aiRes = await api.post('/ai/smart-search', {
          query: q,
          subjectId: subjectIdFilter || undefined
        });
        if (aiRes.data.success) {
          setAiInsight({
            summary: aiRes.data.aiSummary,
            suggestedAction: aiRes.data.suggestedAction
          });
          // If AI ranked relevant topics, enhance the topics ordering
          if (Array.isArray(aiRes.data.topics) && aiRes.data.topics.length > 0) {
            setResults((prev) => ({
              ...prev,
              topics: aiRes.data.topics
            }));
          }
        }
      } catch (aiErr) {
        console.warn('AI search background error:', aiErr);
      } finally {
        setAiSearching(false);
      }
    } else {
      setAiSearching(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(query, selectedSubjectId, statusFilter);
  };

  const totalResultsCount =
    results.subjects.length +
    results.units.length +
    results.topics.length +
    results.notes.length +
    results.materials.length;

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Global Search & Filters
        </h1>
        <p className="text-xs text-slate-500">
          Search across all subjects, units, checklist topics, study documents and revision notes
        </p>
      </div>

      {/* Search and Filters Bar */}
      <form onSubmit={handleSearchSubmit} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <SearchIcon className="w-5 h-5 text-slate-400 absolute left-4 top-3" />
            <input
              type="text"
              placeholder="Search concepts, topics or questions (e.g. 'CAP Theorem', 'Recursion')..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
            />
          </div>

          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition shrink-0"
          >
            <SearchIcon className="w-4 h-4" />
            <span>Search</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
            <Filter className="w-3.5 h-3.5" /> Filter by:
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              const val = e.target.value as any;
              setStatusFilter(val);
              executeSearch(query, selectedSubjectId, val);
            }}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-hidden"
          >
            <option value="all">All Topics (Any status)</option>
            <option value="pending">Pending Topics only</option>
            <option value="completed">Completed Topics only</option>
          </select>

          {/* Subject filter */}
          <select
            value={selectedSubjectId}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedSubjectId(val);
              executeSearch(query, val, statusFilter);
            }}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-hidden"
          >
            <option value="">All Subjects</option>
            {subjectsList.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>

          {(query || statusFilter !== 'all' || selectedSubjectId) && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setStatusFilter('all');
                setSelectedSubjectId('');
                setResults({ subjects: [], units: [], topics: [], notes: [], materials: [] });
                setAiInsight(null);
              }}
              className="text-xs text-rose-500 hover:underline font-semibold ml-auto"
            >
              Clear filters
            </button>
          )}
        </div>
      </form>

      {/* Results View */}
      {/* 1. AI Skeleton Loading State while AI calculates insights */}
      {aiSearching && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-50/70 to-purple-50/70 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-200/80 dark:border-indigo-800/80 shadow-xs space-y-3 animate-pulse">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500 animate-spin" />
            <div className="h-3 w-36 bg-indigo-200 dark:bg-indigo-900 rounded-md" />
            <span className="text-[10px] font-bold text-indigo-500 tracking-wider uppercase ml-auto">
              Analyzing Syllabus...
            </span>
          </div>
          <div className="space-y-2">
            <div className="h-3.5 bg-indigo-200/70 dark:bg-indigo-900/60 rounded-md w-full" />
            <div className="h-3.5 bg-indigo-200/50 dark:bg-indigo-900/40 rounded-md w-4/5" />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <div className="h-2.5 w-24 bg-indigo-300 dark:bg-indigo-800 rounded-md" />
            <div className="h-2.5 w-48 bg-indigo-200/80 dark:bg-indigo-900/50 rounded-md" />
          </div>
        </div>
      )}

      {/* 2. AI Insight Result Card (once loaded) */}
      {!aiSearching && aiInsight && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-50/80 to-purple-50/80 dark:from-indigo-950/40 dark:to-purple-950/40 border border-indigo-200 dark:border-indigo-800 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold text-xs uppercase tracking-wider">
            <Bot className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>AI Curriculum Insight</span>
          </div>
          {aiInsight.summary && (
            <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
              {aiInsight.summary}
            </p>
          )}
          {aiInsight.suggestedAction && (
            <div className="text-[11px] sm:text-xs text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1.5 pt-1">
              <span>Next recommended step:</span>
              <span className="text-slate-700 dark:text-slate-300 font-normal">{aiInsight.suggestedAction}</span>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-slate-400 animate-pulse text-sm">
          Searching through your workspace...
        </div>
      ) : totalResultsCount === 0 && (query || statusFilter !== 'all' || selectedSubjectId) ? (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-8 bg-white/50 dark:bg-slate-900/50">
          <SearchIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            No results match your search
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Try adjusting your search terms or clearing the status/subject filters.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Topics matched */}
          {results.topics.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Topics ({results.topics.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {results.topics.map((t) => {
                  const sub = typeof t.subjectId === 'object' ? t.subjectId : null;
                  const unit = typeof t.unitId === 'object' ? t.unitId : null;
                  return (
                    <div
                      key={t._id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex items-start gap-3"
                    >
                      {t.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-300 shrink-0 mt-0.5" />
                      )}
                      <div className="truncate flex-1">
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {t.title}
                        </h4>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {sub?.name || 'Subject'} &bull; {unit?.name || 'Unit'}
                        </p>
                        {t.description && (
                          <p className="text-xs text-slate-400 line-clamp-1 mt-1 font-mono">
                            {t.description}
                          </p>
                        )}
                      </div>
                      {sub?._id && (
                        <Link
                          to={`/subjects/${sub._id}`}
                          className="text-xs font-bold text-blue-600 hover:underline shrink-0"
                        >
                          View &rarr;
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Subjects matched */}
          {results.subjects.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Subjects ({results.subjects.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {results.subjects.map((s) => (
                  <Link
                    key={s._id}
                    to={`/subjects/${s._id}`}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-blue-400 transition flex items-center gap-3"
                  >
                    <div
                      className="p-2.5 rounded-lg text-white"
                      style={{ backgroundColor: s.color || '#3B82F6' }}
                    >
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div className="truncate">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {s.name}
                      </h4>
                      <p className="text-xs text-slate-400 truncate mt-0.5">
                        {s.description || 'Open Subject syllabus'}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Materials matched */}
          {results.materials.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Study Materials & Uploaded Files ({results.materials.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {results.materials.map((m) => {
                  const topic = typeof m.topicId === 'object' ? m.topicId : null;
                  return (
                    <div
                      key={m._id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 truncate">
                        <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600">
                          {m.type === 'URL' ? <LinkIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                        </div>
                        <div className="truncate">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {m.title}
                          </h4>
                          <p className="text-[11px] text-slate-400 truncate">
                            Topic: {topic?.title || 'Study topic'}
                          </p>
                        </div>
                      </div>

                      {m.type === 'URL' ? (
                        <a
                          href={m.url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/60 rounded-lg flex items-center gap-1 shrink-0"
                        >
                          <span>Open</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setViewerMaterial(m)}
                          className="px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center gap-1 shrink-0"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes matched */}
          {results.notes.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Revision Notes ({results.notes.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {results.notes.map((n) => {
                  const topic = typeof n.topicId === 'object' ? n.topicId : null;
                  const cleanText = n.content.replace(/<[^>]*>?/gm, '').trim();
                  return (
                    <div
                      key={n._id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          {topic?.title || 'Topic Revision Note'}
                        </h4>
                        {topic?._id && (
                          <button
                            type="button"
                            onClick={() => setNoteTopic({ id: topic._id, title: topic.title })}
                            className="text-xs font-semibold text-blue-600 hover:underline"
                          >
                            Open Note &rarr;
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono line-clamp-2 mt-1">
                        {cleanText}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Document Viewer Modal */}
      <DocumentViewerModal
        isOpen={!!viewerMaterial}
        material={viewerMaterial}
        onClose={() => setViewerMaterial(null)}
      />

      {/* Revision Note Modal */}
      {noteTopic && (
        <RevisionNotesModal
          isOpen={!!noteTopic}
          topicId={noteTopic.id}
          topicTitle={noteTopic.title}
          onClose={() => setNoteTopic(null)}
        />
      )}
    </div>
  );
};
