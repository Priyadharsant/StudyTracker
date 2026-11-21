import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileCode,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  X,
  Upload,
  BookOpen,
  Layers,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import api from '../../services/api';
import { Subject } from '../../types';
import { useToast } from '../../contexts/ToastContext';

interface JsonImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: Subject[];
  initialSubjectId?: string;
  onImportSuccess: (createdSubjectId?: string) => void;
}

const FULL_SUBJECT_TEMPLATE = {
  type: "subject",
  subject: {
    name: "Distributed Systems & Cloud Computing",
    description: "Architectures, consensus algorithms, replication, microservices, and fault tolerance.",
    color: "#3B82F6",
    icon: "Globe"
  },
  units: [
    {
      name: "Unit 1: Distributed Foundations & Consensus",
      topics: [
        {
          title: "CAP Theorem and PACELC Principles",
          description: "Understanding Consistency, Availability and Partition Tolerance trade-offs in distributed data stores.",
          materials: [
            {
              type: "url",
              title: "Brewer's Conjecture Paper",
              url: "https://www.infoq.com/articles/cap-twelve-years-later-how-the-rules-have-changed/"
            }
          ]
        },
        {
          title: "Raft Consensus Algorithm",
          description: "Leader election, log replication, and safety guarantees.",
          materials: [
            {
              type: "url",
              title: "Interactive Raft Visualization",
              url: "https://raft.github.io/"
            }
          ]
        }
      ]
    },
    {
      name: "Unit 2: Storage Replication & Partitioning",
      topics: [
        {
          title: "Consistent Hashing & Virtual Nodes",
          description: "Minimizing remapping in distributed DHTs like Amazon Dynamo and Apache Cassandra.",
          materials: [
            {
              type: "url",
              title: "Dynamo Paper Summary",
              url: "https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf"
            }
          ]
        }
      ]
    }
  ]
};

const SINGLE_UNIT_TEMPLATE = {
  type: "unit",
  unit: {
    name: "Unit: Microservices Architecture & Event Sourcing",
    topics: [
      {
        title: "Saga Pattern for Distributed Transactions",
        description: "Choreography vs Orchestration based Saga workflows for eventual consistency.",
        materials: [
          {
            type: "url",
            title: "Microservices.io Saga Pattern",
            url: "https://microservices.io/patterns/data/saga.html"
          }
        ]
      },
      {
        title: "CQRS & Event Sourcing Architecture",
        description: "Separating read models from write models with persistent event logs.",
        materials: [
          {
            type: "url",
            title: "Martin Fowler CQRS Guide",
            url: "https://martinfowler.com/bliki/CQRS.html"
          }
        ]
      }
    ]
  }
};

export const JsonImportModal: React.FC<JsonImportModalProps> = ({
  isOpen,
  onClose,
  subjects,
  initialSubjectId,
  onImportSuccess
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();

  // Mode: 'subject' (Full Subject) | 'unit' (Single Unit)
  const [mode, setMode] = useState<'subject' | 'unit'>('subject');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(initialSubjectId || (subjects[0]?._id || ''));

  // Step state: 1 = Editor/Input, 2 = Preview & Confirm
  const [step, setStep] = useState<1 | 2>(1);

  // JSON Input
  const [jsonText, setJsonText] = useState('');
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null);

  // Validation & Preview state
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Array<{ path: string; message: string }>>([]);
  const [previewData, setPreviewData] = useState<any>(null);

  if (!isOpen) return null;

  const handleCopyTemplate = (type: 'subject' | 'unit') => {
    const template = type === 'subject' ? FULL_SUBJECT_TEMPLATE : SINGLE_UNIT_TEMPLATE;
    const str = JSON.stringify(template, null, 2);
    navigator.clipboard.writeText(str);
    setCopiedTemplate(type);
    toast(`${type === 'subject' ? 'Full Subject' : 'Single Unit'} JSON template copied to clipboard!`, 'success');
    setTimeout(() => setCopiedTemplate(null), 3000);
  };

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      setJsonText(JSON.stringify(parsed, null, 2));
      toast('JSON formatted successfully', 'info');
    } catch {
      toast('Invalid JSON syntax: cannot format', 'error');
    }
  };

  const handleValidateAndPreview = async () => {
    setValidationErrors([]);
    setPreviewData(null);

    // 1. Frontend JSON syntax check
    let parsed: any;
    try {
      parsed = JSON.parse(jsonText);
    } catch (err: any) {
      setValidationErrors([{ path: 'JSON Syntax', message: err.message || 'Invalid JSON syntax' }]);
      toast('JSON syntax error. Please check commas, quotes and brackets.', 'error');
      return;
    }

    if (mode === 'unit' && !selectedSubjectId) {
      toast('Please select a destination subject for the unit', 'error');
      return;
    }

    // 2. Backend validation API
    setValidating(true);
    try {
      const res = await api.post('/import/validate', parsed);
      if (res.data.success && res.data.valid) {
        setPreviewData(res.data.summary);
        setStep(2);
        toast('JSON validated successfully!', 'success');
      }
    } catch (err: any) {
      const resp = err.response?.data;
      if (resp?.errors && Array.isArray(resp.errors)) {
        setValidationErrors(resp.errors);
      } else {
        setValidationErrors([{ path: 'Schema', message: resp?.message || 'Validation failed' }]);
      }
      toast('Validation failed. Review the errors below.', 'error');
    } finally {
      setValidating(false);
    }
  };

  const handleImport = async () => {
    if (!previewData) return;

    let parsed: any;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      toast('Invalid JSON syntax', 'error');
      return;
    }

    setImporting(true);
    try {
      if (mode === 'subject') {
        const res = await api.post('/import/subject', parsed);
        if (res.data.success) {
          toast('Subject and syllabus imported successfully!', 'success');
          onImportSuccess(res.data.subject._id);
          onClose();
          navigate(`/subjects/${res.data.subject._id}`);
        }
      } else {
        const res = await api.post('/import/unit', {
          destinationSubjectId: selectedSubjectId,
          type: 'unit',
          unit: parsed.unit
        });
        if (res.data.success) {
          toast('Unit and topics imported successfully!', 'success');
          onImportSuccess(selectedSubjectId);
          onClose();
          navigate(`/subjects/${selectedSubjectId}`);
        }
      }
    } catch (err: any) {
      toast(err.response?.data?.message || 'Import failed. No partial data was stored.', 'error');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-4xl max-h-[92vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                  AI JSON Checklist Importer
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
                  Step {step} of 2
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Generate course outlines or paste below to import complete checklists
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

        {/* STEP 1: Editor & Configuration */}
        {step === 1 && (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Mode selection tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setMode('subject');
                    setValidationErrors([]);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                    mode === 'subject'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Mode A: Full Subject Template</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('unit');
                    setValidationErrors([]);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                    mode === 'unit'
                      ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Mode B: Single Unit Template</span>
                </button>
              </div>

              {/* Copy Template Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyTemplate(mode)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 transition"
                >
                  {copiedTemplate === mode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy {mode === 'subject' ? 'Subject' : 'Unit'} Template</span>
                </button>
              </div>
            </div>

            {/* Destination Subject Selector if Mode B */}
            {mode === 'unit' && (
              <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-purple-900 dark:text-purple-200">
                    Destination Subject *
                  </h4>
                  <p className="text-xs text-purple-700 dark:text-purple-400">
                    Select which existing subject this unit should be added to:
                  </p>
                </div>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="px-3.5 py-2 text-xs rounded-xl border border-purple-300 dark:border-purple-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium outline-hidden"
                >
                  {subjects.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* JSON Editor Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Paste AI Generated JSON Below:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleFormatJson}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Format JSON
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">&bull;</span>
                  <button
                    type="button"
                    onClick={() => {
                      setJsonText('');
                      setValidationErrors([]);
                    }}
                    className="text-xs font-semibold text-rose-500 hover:underline"
                  >
                    Clear Input
                  </button>
                </div>
              </div>

              <textarea
                rows={14}
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                placeholder={`Paste your JSON output here, or click "Copy ${mode === 'subject' ? 'Subject' : 'Unit'} Template" above to see the expected structure...`}
                className="w-full p-4 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-emerald-400 font-mono text-xs leading-relaxed focus:ring-2 focus:ring-purple-500 outline-hidden resize-none"
              />
            </div>

            {/* Validation Errors Box */}
            {validationErrors.length > 0 && (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200 space-y-2 animate-in fade-in">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>Validation Issues Detected:</span>
                </div>
                <ul className="space-y-1 pl-6 list-disc text-xs font-mono">
                  {validationErrors.map((err, idx) => (
                    <li key={idx}>
                      <span className="font-bold">{err.path}:</span> {err.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Structured Preview */}
        {step === 2 && previewData && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 animate-in fade-in">
            {/* Header summary banner */}
            <div className="p-5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                  {mode === 'subject' ? 'Ready to Create New Subject' : 'Ready to Append Unit'}
                </span>
                <h4 className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                  {previewData.name}
                </h4>
                {previewData.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                    {previewData.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-4 bg-white dark:bg-slate-900 px-4 py-2.5 rounded-xl border border-purple-100 dark:border-purple-900 shrink-0">
                {mode === 'subject' && (
                  <div className="text-center">
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Units</p>
                    <p className="text-base font-bold text-slate-900 dark:text-white">{previewData.totalUnits}</p>
                  </div>
                )}
                <div className="text-center">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Topics</p>
                  <p className="text-base font-bold text-slate-900 dark:text-white">{previewData.totalTopics}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Materials</p>
                  <p className="text-base font-bold text-slate-900 dark:text-white">{previewData.totalMaterials}</p>
                </div>
              </div>
            </div>

            {/* Units & Topics Accordion / Tree */}
            <div className="space-y-4">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Syllabus Outline Breakdown
              </h5>

              {mode === 'subject' && previewData.units && (
                <div className="space-y-3">
                  {previewData.units.map((u: any, uIdx: number) => (
                    <div
                      key={uIdx}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950"
                    >
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-800">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {u.name}
                        </span>
                        <span className="text-xs text-slate-400">
                          {u.topicCount} Topics
                        </span>
                      </div>
                      <div className="space-y-1.5 pl-2">
                        {u.topics.map((t: any, tIdx: number) => (
                          <div key={tIdx} className="flex items-center justify-between text-xs py-1">
                            <span className="text-slate-700 dark:text-slate-300 font-medium">
                              &bull; {t.title}
                            </span>
                            {t.materialCount > 0 && (
                              <span className="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md font-semibold">
                                {t.materialCount} {t.materialCount === 1 ? 'Link' : 'Links'}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {mode === 'unit' && previewData.topics && (
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 space-y-2">
                  {previewData.topics.map((t: any, tIdx: number) => (
                    <div key={tIdx} className="flex items-center justify-between text-xs py-1">
                      <span className="text-slate-700 dark:text-slate-300 font-medium">
                        &bull; {t.title}
                      </span>
                      {t.materialCount > 0 && (
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md font-semibold">
                          {t.materialCount} {t.materialCount === 1 ? 'Link' : 'Links'}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
          {step === 1 ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={validating || !jsonText.trim()}
                onClick={handleValidateAndPreview}
                className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md transition disabled:opacity-50"
              >
                <span>{validating ? 'Validating...' : 'Validate & Preview'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Edit JSON</span>
              </button>

              <button
                type="button"
                disabled={importing}
                onClick={handleImport}
                className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                <span>{importing ? 'Importing Checklist...' : 'Confirm & Import Checklist'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
