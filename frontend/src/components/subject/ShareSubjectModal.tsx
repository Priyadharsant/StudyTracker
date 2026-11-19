import React, { useState, useEffect } from 'react';
import { Share2, Copy, Check, ExternalLink, Globe, Lock, X } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

interface ShareSubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectId: string;
  subjectName: string;
}

export const ShareSubjectModal: React.FC<ShareSubjectModalProps> = ({
  isOpen,
  onClose,
  subjectId,
  subjectName
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isPublic, setIsPublic] = useState(false);
  const [shareCode, setShareCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (!isOpen || !subjectId) return;

    let isMounted = true;
    setLoading(true);

    api
      .get(`/subjects/${subjectId}/share`)
      .then((res) => {
        if (isMounted && res.data.success) {
          setIsPublic(res.data.isPublic ?? true);
          setShareCode(res.data.shareCode || '');
        }
      })
      .catch(() => {
        if (isMounted) toast('Failed to load sharing details', 'error');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, subjectId]);

  if (!isOpen) return null;

  const shareUrl = `${window.location.origin}/share/${shareCode}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast('Share link copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast('Failed to copy to clipboard', 'error');
    }
  };

  const handleToggle = async () => {
    setToggling(true);
    try {
      const res = await api.post(`/subjects/${subjectId}/share`, {
        isPublic: !isPublic
      });
      if (res.data.success) {
        setIsPublic(res.data.isPublic);
        toast(
          res.data.isPublic
            ? 'Public link enabled! Anyone with link can view.'
            : 'Public link disabled. Shared page is now private.',
          'info'
        );
      }
    } catch {
      toast('Failed to update share setting', 'error');
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Share Subject
              </h3>
              <p className="text-xs text-slate-500 truncate max-w-[240px]">
                {subjectName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {loading ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-400 font-medium">Generating share link...</p>
            </div>
          ) : (
            <>
              {/* Toggle Access */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/70 dark:border-slate-700/60">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      isPublic
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                    }`}
                  >
                    {isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {isPublic ? 'Public Link Active' : 'Link Sharing Disabled'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {isPublic
                        ? 'Anyone with the link can view & check items'
                        : 'Only you can view this subject'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={toggling}
                  onClick={handleToggle}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    isPublic ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                      isPublic ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Share URL Box */}
              {isPublic && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Shareable Read-Only Link
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={shareUrl}
                      className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 select-all font-mono outline-hidden focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-200" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Open in new tab test */}
                  <div className="pt-1">
                    <a
                      href={shareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-medium"
                    >
                      <span>Preview shared view</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}

              {/* Feature Note */}
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl">
                <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                  💡 <strong>Read-Only & Local Checklist:</strong> Anyone visiting your shared link can view all units, topics, materials, and notes. When they tick checklist items, their progress is stored locally in their browser cache without changing your original subject data.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700/60 rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
