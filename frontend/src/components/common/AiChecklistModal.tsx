import React, { useState } from 'react';
import {
  Sparkles,
  Bot,
  Layers,
  BookOpen,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ExternalLink,
  Plus,
  Trash2,
  Edit2,
  ChevronRight,
  RotateCcw,
  RefreshCw,
  X
} from 'lucide-react';
import api from '../../services/api';
import { Subject, Unit } from '../../types';
import { useToast } from '../../contexts/ToastContext';

interface AiChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: Subject[];
  initialSubjectId?: string;
  initialUnitId?: string;
  onSuccess: (createdSubjectId?: string) => void;
}

export const AiChecklistModal: React.FC<AiChecklistModalProps> = ({
  isOpen,
  onClose,
  subjects,
  initialSubjectId,
  initialUnitId,
  onSuccess
}) => {
  const { toast } = useToast();

  // Mode: 'subject' (Complete Subject) or 'unit' (Individual Unit)
  const [mode, setMode] = useState<'subject' | 'unit'>(initialUnitId ? 'unit' : 'subject');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    initialSubjectId || (subjects[0]?._id || '')
  );
  const [availableUnits, setAvailableUnits] = useState<Unit[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string>(initialUnitId || '');
  const [loadingUnits, setLoadingUnits] = useState(false);

  // Form inputs
  const [subjectName, setSubjectName] = useState('');
  const [unitName, setUnitName] = useState('');
  const [content, setContent] = useState('');

  // Step: 1 = Input, 2 = Preview & Edit
  const [step, setStep] = useState<1 | 2>(1);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Generated & Editable Checklist State
  const [generatedSubject, setGeneratedSubject] = useState<{
    name: string;
    description: string;
    color: string;
    icon: string;
  }>({
    name: '',
    description: '',
    color: '#3B82F6',
    icon: 'BookOpen'
  });

  const [generatedUnits, setGeneratedUnits] = useState<
    Array<{
      name: string;
      topics: Array<{
        title: string;
        description: string;
        materials: Array<{
          type: 'url';
          title: string;
          url: string;
        }>;
      }>;
    }>
  >([]);

  // Load units when selected subject changes for 'unit' mode
  React.useEffect(() => {
    if (mode === 'unit' && selectedSubjectId) {
      setLoadingUnits(true);
      api
        .get(`/subjects/${selectedSubjectId}/units`)
        .then((res) => {
          if (res.data.success) {
            const fetchedUnits = res.data.units || [];
            setAvailableUnits(fetchedUnits);
            if (fetchedUnits.length > 0 && !selectedUnitId) {
              setSelectedUnitId(fetchedUnits[0]._id);
            }
          }
        })
        .catch(() => {
          toast('Failed to load subject units', 'error');
        })
        .finally(() => setLoadingUnits(false));
    }
  }, [mode, selectedSubjectId]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!content.trim() || content.trim().length < 10) {
      setErrorMsg('Please paste syllabus text, notes or unit questions (minimum 10 characters).');
      return;
    }

    if (mode === 'unit' && !selectedSubjectId) {
      setErrorMsg('Please select an existing subject for individual unit generation.');
      return;
    }

    setErrorMsg(null);
    setGenerating(true);

    try {
      const payload: any = {
        mode,
        content: content.trim()
      };

      if (mode === 'subject') {
        if (subjectName.trim()) payload.subjectName = subjectName.trim();
      } else {
        const sub = subjects.find((s) => s._id === selectedSubjectId);
        if (sub) payload.subjectName = sub.name;

        const targetUnit = availableUnits.find((u) => u._id === selectedUnitId);
        if (targetUnit) {
          payload.unitName = targetUnit.name;
        } else if (unitName.trim()) {
          payload.unitName = unitName.trim();
        }
      }

      const res = await api.post('/ai/generate-checklist', payload);

      if (res.data.success && res.data.data) {
        const result = res.data.data;
        if (mode === 'subject') {
          setGeneratedSubject({
            name: result.subject?.name || subjectName || 'New Subject',
            description: result.subject?.description || '',
            color: result.subject?.color || '#3B82F6',
            icon: result.subject?.icon || 'BookOpen'
          });
          setGeneratedUnits(result.units || []);
        } else {
          // Mode: unit
          const unitData = result.unit;
          setGeneratedUnits([
            {
              name: unitData?.name || unitName || 'Generated Unit',
              topics: unitData?.topics || []
            }
          ]);
        }
        setStep(2);
        toast('AI Checklist generated! Review and customize below.', 'success');
      } else {
        setErrorMsg(res.data.message || 'Generation failed.');
      }
    } catch (err: any) {
      console.error('AI Generation Error:', err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Failed to generate checklist. Please verify your Groq API configuration.';
      setErrorMsg(msg);
      toast(msg, 'error');
    } finally {
      setGenerating(false);
    }
  };

  // Editing handlers in preview step
  const handleUpdateUnitName = (unitIdx: number, newName: string) => {
    const updated = [...generatedUnits];
    updated[unitIdx].name = newName;
    setGeneratedUnits(updated);
  };

  const handleRemoveUnit = (unitIdx: number) => {
    if (generatedUnits.length <= 1) {
      toast('A checklist must contain at least one unit.', 'error');
      return;
    }
    const updated = generatedUnits.filter((_, idx) => idx !== unitIdx);
    setGeneratedUnits(updated);
  };

  const handleAddUnit = () => {
    setGeneratedUnits([
      ...generatedUnits,
      {
        name: `Unit ${generatedUnits.length + 1}: New Chapter`,
        topics: [
          {
            title: 'New Topic',
            description: '',
            materials: []
          }
        ]
      }
    ]);
  };

  const handleUpdateTopic = (unitIdx: number, topicIdx: number, field: string, val: any) => {
    const updated = [...generatedUnits];
    updated[unitIdx].topics[topicIdx] = {
      ...updated[unitIdx].topics[topicIdx],
      [field]: val
    };
    setGeneratedUnits(updated);
  };

  const handleRemoveTopic = (unitIdx: number, topicIdx: number) => {
    const updated = [...generatedUnits];
    if (updated[unitIdx].topics.length <= 1) {
      toast('Each unit must have at least one topic.', 'error');
      return;
    }
    updated[unitIdx].topics = updated[unitIdx].topics.filter((_, idx) => idx !== topicIdx);
    setGeneratedUnits(updated);
  };

  const handleAddTopic = (unitIdx: number) => {
    const updated = [...generatedUnits];
    updated[unitIdx].topics.push({
      title: 'New Topic',
      description: '',
      materials: []
    });
    setGeneratedUnits(updated);
  };

  const handleAddMaterial = (unitIdx: number, topicIdx: number) => {
    const url = prompt('Enter reference material URL (http:// or https://):');
    if (!url || !url.trim().startsWith('http')) {
      if (url) toast('Please enter a valid HTTP/HTTPS URL', 'error');
      return;
    }
    const title = prompt('Enter material title:', 'Reference Document') || 'Reference Link';
    const updated = [...generatedUnits];
    const topic = updated[unitIdx].topics[topicIdx];
    topic.materials = [
      ...(topic.materials || []),
      { type: 'url', title: title.trim(), url: url.trim() }
    ];
    setGeneratedUnits(updated);
  };

  const handleRemoveMaterial = (unitIdx: number, topicIdx: number, matIdx: number) => {
    const updated = [...generatedUnits];
    const topic = updated[unitIdx].topics[topicIdx];
    topic.materials = topic.materials.filter((_, idx) => idx !== matIdx);
    setGeneratedUnits(updated);
  };

  // Final Confirmation & Save
  const handleSaveAndCreate = async () => {
    setSaving(true);
    try {
      if (mode === 'subject') {
        // Validate required subject title
        if (!generatedSubject.name.trim()) {
          toast('Subject name cannot be empty', 'error');
          setSaving(false);
          return;
        }

        const payload = {
          type: 'subject',
          subject: generatedSubject,
          units: generatedUnits
        };

        const res = await api.post('/import/subject', payload);
        if (res.data.success) {
          toast('AI Subject checklist created successfully!', 'success');
          onSuccess(res.data.subject?._id);
          onClose();
        }
      } else {
        // Mode: unit
        const currentUnit = generatedUnits[0];
        if (!currentUnit || !currentUnit.topics.length) {
          toast('Unit must contain at least one topic', 'error');
          setSaving(false);
          return;
        }

        if (selectedUnitId && selectedUnitId !== 'new') {
          // Merge topics directly into existing unit, preserving existing units and topics
          const res = await api.post('/ai/merge-unit-topics', {
            unitId: selectedUnitId,
            topics: currentUnit.topics,
            mergeMode: 'append'
          });

          if (res.data.success) {
            toast(res.data.message || 'Topics successfully added to existing unit!', 'success');
            onSuccess(selectedSubjectId);
            onClose();
          }
        } else {
          // Create as a brand new unit under the selected subject
          const payload = {
            destinationSubjectId: selectedSubjectId,
            type: 'unit',
            unit: {
              name: currentUnit.name,
              topics: currentUnit.topics
            }
          };

          const res = await api.post('/import/unit', payload);
          if (res.data.success) {
            toast('AI Unit checklist created successfully!', 'success');
            onSuccess(selectedSubjectId);
            onClose();
          }
        }
      }
    } catch (err: any) {
      console.error('Failed to save AI checklist:', err);
      toast(err.response?.data?.message || 'Failed to save checklist to database', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto animate-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:px-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-linear-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">
                  Create with AI
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  Groq Powered
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {step === 1
                  ? 'Paste raw syllabus, questions or curriculum notes to auto-generate checklists'
                  : 'Review and customize your AI-generated checklist before saving'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center border-b border-slate-100 dark:border-slate-800 px-6 py-2.5 bg-white dark:bg-slate-900 shrink-0 text-xs">
          <div className={`flex items-center gap-2 font-bold ${step === 1 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 1 ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600'}`}>
              1
            </span>
            <span>Configure & Paste Syllabus</span>
          </div>
          <ChevronRight className="w-4 h-4 mx-3 text-slate-300 dark:text-slate-700" />
          <div className={`flex items-center gap-2 font-bold ${step === 2 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 2 ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600'}`}>
              2
            </span>
            <span>Preview & Save Checklist</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:px-8 overflow-y-auto flex-1 space-y-5">
          {errorMsg && (
            <div className="flex items-start gap-3 p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMsg}</div>
            </div>
          )}

          {step === 1 ? (
            /* STEP 1: Configuration & Syllabus Input */
            <div className="space-y-5">
              {/* Mode Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                  Generation Mode
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMode('subject')}
                    className={`flex items-start gap-3 p-4 rounded-2xl border text-left transition ${
                      mode === 'subject'
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <BookOpen className={`w-5 h-5 shrink-0 mt-0.5 ${mode === 'subject' ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white">
                        Complete Subject
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Extract multiple units, all subtopics, and structured resources from an entire course syllabus.
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode('unit')}
                    className={`flex items-start gap-3 p-4 rounded-2xl border text-left transition ${
                      mode === 'unit'
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <Layers className={`w-5 h-5 shrink-0 mt-0.5 ${mode === 'unit' ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white">
                        Individual Unit / Chapter
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Generate checklist items for one specific chapter and merge safely without affecting other units.
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Subject & Unit Selectors */}
              {mode === 'subject' ? (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Subject Name (Optional Override)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Distributed Computing Systems (Leave blank to auto-detect from syllabus)"
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                      Target Subject *
                    </label>
                    <select
                      value={selectedSubjectId}
                      onChange={(e) => {
                        setSelectedSubjectId(e.target.value);
                        setSelectedUnitId('');
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
                    >
                      {subjects.map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                      Merge into Unit
                    </label>
                    {loadingUnits ? (
                      <div className="py-2.5 text-xs text-slate-400 flex items-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading units...
                      </div>
                    ) : (
                      <select
                        value={selectedUnitId}
                        onChange={(e) => setSelectedUnitId(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
                      >
                        <option value="new">+ Create as New Unit</option>
                        {availableUnits.map((u) => (
                          <option key={u._id} value={u._id}>
                            Append to: {u.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              )}

              {/* Large Content Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Syllabus / Notes / Questions Text *
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {content.length.toLocaleString()} characters
                  </span>
                </div>
                <textarea
                  rows={10}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={
                    mode === 'subject'
                      ? `Paste course syllabus, curriculum modules or lecture notes here...\n\nExample:\nCOURSE: Distributed Systems\nUNIT 1: Fundamentals of Distributed Systems\n- CAP Theorem\n- Consensus Protocols (Raft, Paxos)\n- Consistent Hashing\nReference: https://raft.github.io/`
                      : `Paste chapter notes, syllabus bullet points or test questions for this unit...\n\nExample:\nUNIT: Concurrency & Multithreading\n1. Thread lifecycle and state transitions\n2. Synchronization primitives (Mutex, Semaphores)\n3. Deadlock prevention and Banker's Algorithm\nReadings: https://en.wikipedia.org/wiki/Banker%27s_algorithm`
                  }
                  className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono outline-hidden focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                />
                <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  AI will extract units, topics, and descriptions. You can attach study materials and links manually in the preview or subject editor.
                </p>
              </div>
            </div>
          ) : (
            /* STEP 2: Preview & Editing */
            <div className="space-y-6">
              {/* Subject metadata (if complete subject mode) */}
              {mode === 'subject' && (
                <div className="p-4 rounded-2xl border border-indigo-100 dark:border-indigo-950/60 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: generatedSubject.color }}
                    />
                    <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider">
                      Subject Overview
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                        Subject Name
                      </label>
                      <input
                        type="text"
                        value={generatedSubject.name}
                        onChange={(e) =>
                          setGeneratedSubject({ ...generatedSubject, name: e.target.value })
                        }
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                        Color Theme
                      </label>
                      <div className="flex items-center gap-1.5 py-1">
                        {['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4'].map(
                          (c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setGeneratedSubject({ ...generatedSubject, color: c })}
                              className={`w-5 h-5 rounded-full transition-transform ${
                                generatedSubject.color === c ? 'scale-125 ring-2 ring-indigo-500' : 'hover:scale-110'
                              }`}
                              style={{ backgroundColor: c }}
                            />
                          )
                        )}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={generatedSubject.description}
                      onChange={(e) =>
                        setGeneratedSubject({ ...generatedSubject, description: e.target.value })
                      }
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                      placeholder="Course description..."
                    />
                  </div>
                </div>
              )}

              {/* Units and Topics List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Units & Topics ({generatedUnits.reduce((acc, u) => acc + u.topics.length, 0)} total topics)
                  </div>
                  {mode === 'subject' && (
                    <button
                      type="button"
                      onClick={handleAddUnit}
                      className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Unit</span>
                    </button>
                  )}
                </div>

                {generatedUnits.map((u, uIdx) => (
                  <div
                    key={uIdx}
                    className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs"
                  >
                    {/* Unit header */}
                    <div className="flex items-center justify-between gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Layers className="w-4 h-4 text-indigo-500 shrink-0" />
                        <input
                          type="text"
                          value={u.name}
                          onChange={(e) => handleUpdateUnitName(uIdx, e.target.value)}
                          className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 outline-hidden flex-1"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-slate-400">
                          {u.topics.length} topics
                        </span>
                        {mode === 'subject' && (
                          <button
                            type="button"
                            onClick={() => handleRemoveUnit(uIdx)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                            title="Remove unit"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Topics inside unit */}
                    <div className="p-3 sm:p-4 space-y-2.5">
                      {u.topics.map((t, tIdx) => (
                        <div
                          key={tIdx}
                          className="p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-indigo-500">
                                  #{tIdx + 1}
                                </span>
                                <input
                                  type="text"
                                  value={t.title}
                                  onChange={(e) =>
                                    handleUpdateTopic(uIdx, tIdx, 'title', e.target.value)
                                  }
                                  className="w-full text-xs font-bold text-slate-800 dark:text-slate-200 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 outline-hidden"
                                />
                              </div>
                              <input
                                type="text"
                                value={t.description || ''}
                                onChange={(e) =>
                                  handleUpdateTopic(uIdx, tIdx, 'description', e.target.value)
                                }
                                placeholder="Topic description / notes..."
                                className="w-full text-[11px] text-slate-500 dark:text-slate-400 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 outline-hidden"
                              />
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleAddMaterial(uIdx, tIdx)}
                                className="px-2 py-1 text-[10px] font-semibold text-blue-600 bg-blue-50 dark:bg-blue-950/40 rounded-lg hover:bg-blue-100 transition"
                                title="Attach URL reference"
                              >
                                + Link
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveTopic(uIdx, tIdx)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition"
                                title="Delete topic"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Attached URLs */}
                          {t.materials && t.materials.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              {t.materials.map((m, mIdx) => (
                                <div
                                  key={mIdx}
                                  className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] text-slate-700 dark:text-slate-300"
                                >
                                  <ExternalLink className="w-2.5 h-2.5 text-blue-500" />
                                  <span className="max-w-[140px] truncate" title={m.url}>
                                    {m.title || m.url}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveMaterial(uIdx, tIdx, mIdx)}
                                    className="text-slate-400 hover:text-rose-500 ml-1"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => handleAddTopic(uIdx)}
                        className="w-full py-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-500 hover:text-indigo-600 hover:border-indigo-300 transition flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Topic to {u.name}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between p-4 sm:px-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 shrink-0">
          {step === 1 ? (
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Bot className="w-4 h-4 text-indigo-500" />
              <span>Groq Free Tier Optimized (15 requests / 15m)</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Back to Edit Prompt</span>
            </button>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl transition"
            >
              Cancel
            </button>

            {step === 1 ? (
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating || !content.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 disabled:opacity-50 transition"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing & Parsing Syllabus...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Checklist</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSaveAndCreate}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md disabled:opacity-50 transition"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Checklist...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Create Checklist</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
