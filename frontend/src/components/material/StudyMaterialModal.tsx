import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Plus,
  Link as LinkIcon,
  UploadCloud,
  FileText,
  ExternalLink,
  Trash2,
  Edit2,
  Eye,
  Download,
  AlertCircle
} from 'lucide-react';
import api from '../../services/api';
import { Material } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { DocumentViewerModal } from '../common/DocumentViewerModal';

interface StudyMaterialModalProps {
  topicId?: string;
  topicTitle?: string;
  unitId?: string;
  unitTitle?: string;
  isOpen: boolean;
  onClose: () => void;
  onMaterialCountChange?: () => void;
}

export const StudyMaterialModal: React.FC<StudyMaterialModalProps> = ({
  topicId,
  topicTitle,
  unitId,
  unitTitle,
  isOpen,
  onClose,
  onMaterialCountChange
}) => {
  const isUnitMode = !!unitId && !topicId;
  const targetTitle = topicTitle || unitTitle || (isUnitMode ? 'Unit' : 'Topic');
  const { toast } = useToast();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'list' | 'add-url' | 'upload'>('list');

  // URL Form state
  const [urlTitle, setUrlTitle] = useState('');
  const [urlAddress, setUrlAddress] = useState('');
  const [urlDesc, setUrlDesc] = useState('');
  const [submittingUrl, setSubmittingUrl] = useState(false);

  // Upload Form state
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Edit Material state
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Viewer Modal state
  const [viewerMaterial, setViewerMaterial] = useState<Material | null>(null);

  // Deletion confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || (!topicId && !unitId)) return;

    fetchMaterials();
  }, [isOpen, topicId, unitId]);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const endpoint = isUnitMode ? `/units/${unitId}/materials` : `/topics/${topicId}/materials`;
      const res = await api.get(endpoint);
      if (res.data.success) {
        setMaterials(res.data.materials || []);
      }
    } catch {
      toast('Failed to load study materials', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlAddress || !urlTitle) {
      toast('Title and URL are required', 'error');
      return;
    }

    setSubmittingUrl(true);
    try {
      const endpoint = isUnitMode ? `/units/${unitId}/materials/url` : `/topics/${topicId}/materials`;
      const res = await api.post(endpoint, {
        title: urlTitle,
        url: urlAddress.startsWith('http') ? urlAddress : `https://${urlAddress}`,
        description: urlDesc
      });

      if (res.data.success) {
        toast('Material URL added!', 'success');
        setUrlTitle('');
        setUrlAddress('');
        setUrlDesc('');
        setTab('list');
        fetchMaterials();
        if (onMaterialCountChange) onMaterialCountChange();
      }
    } catch (err: any) {
      toast(err.response?.data?.message || 'Failed to add URL material', 'error');
    } finally {
      setSubmittingUrl(false);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast('Please choose a document to upload', 'error');
      return;
    }

    const formData = new FormData();
    if (isUnitMode) {
      formData.append('unitId', unitId!);
    } else {
      formData.append('topicId', topicId!);
    }
    formData.append('title', uploadTitle || selectedFile.name);
    formData.append('description', uploadDesc);
    formData.append('file', selectedFile);

    setUploading(true);
    setUploadProgress(0);

    try {
      const uploadEndpoint = isUnitMode ? '/materials/upload-unit' : '/materials/upload';
      const res = await api.post(uploadEndpoint, formData, {
        headers: { 'Content-Type': undefined },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
          }
        }
      });

      if (res.data.success) {
        toast('Document uploaded successfully!', 'success');
        setSelectedFile(null);
        setUploadTitle('');
        setUploadDesc('');
        setTab('list');
        fetchMaterials();
        if (onMaterialCountChange) onMaterialCountChange();
      }
    } catch (err: any) {
      toast(err.response?.data?.message || 'Failed to upload document', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMaterial) return;

    setSavingEdit(true);
    try {
      const res = await api.patch(`/materials/${editingMaterial._id}`, {
        title: editTitle,
        description: editDesc,
        url: editingMaterial.type === 'URL' ? editUrl : undefined
      });

      if (res.data.success) {
        toast('Material updated', 'success');
        setEditingMaterial(null);
        fetchMaterials();
      }
    } catch {
      toast('Failed to update material', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    try {
      await api.delete(`/materials/${deletingId}`);
      toast('Material removed', 'info');
      setDeletingId(null);
      fetchMaterials();
      if (onMaterialCountChange) onMaterialCountChange();
    } catch {
      toast('Failed to delete material', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in">
        <div className="w-full max-w-3xl max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                {isUnitMode ? 'Unit Study Materials & Documents' : 'Topic Study Materials & Documents'}
              </span>
              <h3 className="font-semibold text-lg text-slate-900 dark:text-white truncate">
                {targetTitle}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center justify-between px-6 py-2.5 bg-slate-100/60 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setTab('list'); setEditingMaterial(null); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  tab === 'list' && !editingMaterial
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Materials ({materials.length})
              </button>
              <button
                type="button"
                onClick={() => { setTab('add-url'); setEditingMaterial(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  tab === 'add-url'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>Add URL</span>
              </button>
              <button
                type="button"
                onClick={() => { setTab('upload'); setEditingMaterial(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  tab === 'upload'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Upload Document</span>
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* VIEW 1: Material List */}
            {tab === 'list' && !editingMaterial && (
              <div>
                {loading ? (
                  <div className="text-center py-12 text-slate-400">Loading materials...</div>
                ) : materials.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-8">
                    <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                    <h4 className="text-base font-medium text-slate-700 dark:text-slate-300">
                      No study materials attached yet
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Attach external links, YouTube tutorials, lecture notes or upload PDF/Word documents for this topic.
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-3">
                      <button
                        onClick={() => setTab('add-url')}
                        className="px-3 py-2 text-xs font-semibold text-blue-600 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100"
                      >
                        + Add Web Link
                      </button>
                      <button
                        onClick={() => setTab('upload')}
                        className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100"
                      >
                        + Upload Document
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {materials.map((m) => (
                      <div
                        key={m._id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/40 shadow-xs transition gap-3"
                      >
                        <div className="flex items-start gap-3 flex-1 overflow-hidden">
                          <div className={`p-2.5 rounded-xl shrink-0 ${
                            m.type === 'URL'
                              ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                              : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {m.type === 'URL' ? <LinkIcon className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                          </div>
                          <div className="truncate">
                            <h4 className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                              {m.title}
                            </h4>
                            {m.description && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                {m.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                              <span>{m.type === 'URL' ? 'External Link' : m.originalFileName || 'File'}</span>
                              {m.fileSize ? <span>• {(m.fileSize / (1024 * 1024)).toFixed(2)} MB</span> : null}
                              <span>• {new Date(m.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          {m.type === 'URL' ? (
                            <a
                              href={m.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs transition"
                            >
                              <span>OPEN STUDY MATERIAL</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => setViewerMaterial(m)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition"
                                title="View Document"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>View</span>
                              </button>
                              <a
                                href={`${import.meta.env.VITE_API_BASE_URL || '/api'}/materials/${m._id}/download?token=${encodeURIComponent(localStorage.getItem('studytrack_token') || '')}`}
                                download
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition"
                                title="Download Document"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setEditingMaterial(m);
                              setEditTitle(m.title);
                              setEditDesc(m.description || '');
                              setEditUrl(m.url || '');
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                            title="Edit Material"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingId(m._id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                            title="Delete Material"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* VIEW 2: Add URL Form */}
            {tab === 'add-url' && !editingMaterial && (
              <form onSubmit={handleAddUrl} className="max-w-xl mx-auto space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Material Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Official React Documentation or MIT Lecture 3"
                    value={urlTitle}
                    onChange={(e) => setUrlTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Web URL *
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://example.com/guide or youtube.com/watch?..."
                    value={urlAddress}
                    onChange={(e) => setUrlAddress(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Description (optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Brief notes about what this link covers..."
                    value={urlDesc}
                    onChange={(e) => setUrlDesc(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setTab('list')}
                    className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingUrl}
                    className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs disabled:opacity-50"
                  >
                    {submittingUrl ? 'Saving...' : 'Save Material Link'}
                  </button>
                </div>
              </form>
            )}

            {/* VIEW 3: Document Upload Form */}
            {tab === 'upload' && !editingMaterial && (
              <form onSubmit={handleFileUpload} className="max-w-xl mx-auto space-y-4">
                {/* Drag and drop box */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 rounded-2xl p-8 text-center cursor-pointer bg-slate-50/50 dark:bg-slate-800/30 transition group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                        if (!uploadTitle) setUploadTitle(e.target.files[0].name);
                      }
                    }}
                  />
                  <UploadCloud className="w-12 h-12 text-slate-400 group-hover:text-blue-500 mx-auto mb-2 transition" />
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {selectedFile ? (
                      <span className="text-blue-600 dark:text-blue-400 font-bold">
                        {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                      </span>
                    ) : (
                      'Click to browse or drop your document here'
                    )}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Supports PDF, DOC, DOCX, PPT, PPTX, TXT, Images (Max 25MB)
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Display Title (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Defaults to original file name"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Description (optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Notes about chapter, page numbers or exercise..."
                    value={uploadDesc}
                    onChange={(e) => setUploadDesc(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>

                {uploading && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-500 font-medium">
                      <span>Uploading document...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all duration-200"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setTab('list')}
                    className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading || !selectedFile}
                    className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs disabled:opacity-50"
                  >
                    {uploading ? 'Uploading...' : 'Upload Document'}
                  </button>
                </div>
              </form>
            )}

            {/* VIEW 4: Edit Material */}
            {editingMaterial && (
              <form onSubmit={handleUpdate} className="max-w-xl mx-auto space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                  <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                    Edit {editingMaterial.type === 'URL' ? 'Web Link' : 'Document Details'}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setEditingMaterial(null)}
                    className="text-xs text-slate-500 hover:underline"
                  >
                    Cancel
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>

                {editingMaterial.type === 'URL' && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      URL *
                    </label>
                    <input
                      type="url"
                      required
                      value={editUrl}
                      onChange={(e) => setEditUrl(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingMaterial(null)}
                    className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs disabled:opacity-50"
                  >
                    {savingEdit ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!deletingId}
        title="Delete Material?"
        message="Are you sure you want to delete this study material? If it is an uploaded document, it will also be deleted from storage."
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeletingId(null)}
      />

      <DocumentViewerModal
        isOpen={!!viewerMaterial}
        material={viewerMaterial}
        onClose={() => setViewerMaterial(null)}
      />
    </>
  );
};
