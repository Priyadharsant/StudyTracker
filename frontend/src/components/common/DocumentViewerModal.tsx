import React from 'react';
import { X, Download, FileText, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { Material } from '../../types';

interface DocumentViewerModalProps {
  material: Material | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  material,
  isOpen,
  onClose
}) => {
  if (!isOpen || !material) return null;

  const isImage = material.mimeType?.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(material.originalFileName || '');
  const isPdf = material.mimeType === 'application/pdf' || /\.pdf$/i.test(material.originalFileName || '');
  const isTxt = material.mimeType?.startsWith('text/') || /\.txt$/i.test(material.originalFileName || '');
  
  const token = typeof window !== 'undefined' ? localStorage.getItem('studytrack_token') : null;
  const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : '';
  const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';

  // If material has a direct public storage URL (e.g. Supabase Storage CDN), use it directly for iframe/img
  // Otherwise, fallback to the backend authenticated proxy route
  const fileUrl = material.type === 'URL'
    ? material.url
    : (material.url && material.url.startsWith('http') && !material.url.includes('/api/materials/file-content/'))
      ? material.url
      : `${apiBase}/materials/${material._id}/view${tokenQuery}`;
  
  const downloadUrl = (material.url && material.url.startsWith('http') && !material.url.includes('/api/materials/file-content/'))
    ? material.url
    : `${apiBase}/materials/${material._id}/download${tokenQuery}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-5xl h-[88vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              {isImage ? <ImageIcon className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            </div>
            <div className="truncate">
              <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                {material.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {material.originalFileName || material.url || 'Document viewer'}
                {material.fileSize ? ` • ${(material.fileSize / (1024 * 1024)).toFixed(2)} MB` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {material.type === 'FILE' && (
              <a
                href={downloadUrl}
                download
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </a>
            )}
            {material.type === 'URL' && material.url && (
              <a
                href={material.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in Tab</span>
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewer Content */}
        <div className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-4">
          {isImage ? (
            <img
              src={fileUrl}
              alt={material.title}
              className="max-h-full max-w-full object-contain rounded-lg shadow-md"
            />
          ) : isPdf ? (
            <iframe
              src={fileUrl}
              title={material.title}
              className="w-full h-full rounded-lg border-0 bg-white"
            />
          ) : isTxt ? (
            <iframe
              src={fileUrl}
              title={material.title}
              className="w-full h-full rounded-lg border-0 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-4 font-mono text-sm"
            />
          ) : (
            <div className="text-center p-8 max-w-md">
              <FileText className="w-16 h-16 mx-auto text-slate-400 dark:text-slate-600 mb-4" />
              <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">
                Preview not available for this file type
              </h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                This document format (.docx, .pptx, or binary) cannot be previewed directly in browser. Please download it to view on your device.
              </p>
              <a
                href={downloadUrl}
                download
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md transition"
              >
                <Download className="w-4 h-4" />
                Download Document
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
