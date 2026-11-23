import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  MessageSquare,
  Send,
  X,
  Bot,
  User,
  Sparkles,
  HelpCircle,
  Lightbulb,
  FileQuestion,
  BookOpen,
  Loader2
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

interface AiTopicChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  topicId: string;
  topicTitle: string;
  subjectName?: string;
  unitName?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  'Explain this concept in simple terms with an example',
  'What are the most common exam questions on this topic?',
  'Give me 3 practice quiz questions with answers',
  'What are the key formulas or rules I must remember?'
];

export const AiTopicChatModal: React.FC<AiTopicChatModalProps> = ({
  isOpen,
  onClose,
  topicId,
  topicTitle,
  subjectName,
  unitName
}) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Initialize or load conversation from session/localStorage
  useEffect(() => {
    if (!isOpen || !topicId) return;

    const cacheKey = `studytrack_chat_${topicId}`;
    try {
      const stored = sessionStorage.getItem(cacheKey);
      if (stored) {
        setMessages(JSON.parse(stored));
        return;
      }
    } catch {
      // ignore
    }

    // Default welcome message
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: `Hi! I'm your AI study mentor for **${topicTitle}** ${
          subjectName ? `(${subjectName})` : ''
        }. Ask me any doubt, request step-by-step explanations, or practice quiz questions!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  }, [isOpen, topicId, topicTitle, subjectName]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Save to session cache
  const saveConversation = (updated: ChatMessage[]) => {
    setMessages(updated);
    try {
      sessionStorage.setItem(`studytrack_chat_${topicId}`, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleSend = async (messageText?: string) => {
    const textToSend = (messageText || input).trim();
    if (!textToSend || loading) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newHistory = [...messages, userMsg];
    saveConversation(newHistory);
    setInput('');
    setLoading(true);

    try {
      // Send conversation context to backend
      const payloadMessages = newHistory
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({
          role: m.role,
          content: m.content
        }));

      const res = await api.post('/ai/chat-topic', {
        topicId,
        messages: payloadMessages
      });

      if (res.data.success && res.data.reply) {
        const assistantMsg: ChatMessage = {
          id: `ai_${Date.now()}`,
          role: 'assistant',
          content: res.data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        saveConversation([...newHistory, assistantMsg]);
      } else {
        throw new Error(res.data.message || 'Failed to get answer');
      }
    } catch (err: any) {
      toast(err.response?.data?.message || err.message || 'AI tutor encountered an error.', 'error');
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: `⚠️ Sorry, I could not complete that request right now: ${
          err.response?.data?.message || err.message || 'Please try again in a moment.'
        }`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      saveConversation([...newHistory, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl h-[88vh] sm:h-[82vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Bot className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                  AI Doubt & Topic Tutor
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300">
                  Topic AI
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                {topicTitle} {unitName ? `• ${unitName}` : ''}
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

        {/* Chat Messages Log */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                    isUser
                      ? 'bg-blue-600 text-white'
                      : 'bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-300'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60'
                  }`}
                >
                  {isUser ? (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  ) : (
                    <div className="prose prose-xs sm:prose-sm dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 leading-relaxed [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:list-disc [&>ul]:pl-4 [&>ol]:list-decimal [&>ol]:pl-4 [&>li]:mb-1 [&>strong]:text-slate-900 dark:[&>strong]:text-white [&>code]:bg-slate-200/70 dark:[&>code]:bg-slate-700/60 [&>code]:px-1 [&>code]:py-0.5 [&>code]:rounded [&>code]:text-[11px]">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                  <span
                    className={`text-[10px] block mt-1.5 ${
                      isUser ? 'text-blue-200 text-right' : 'text-slate-400'
                    }`}
                  >
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Loading Indicator */}
          {loading && (
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-300 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className="bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl px-4 py-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
                <span className="text-xs text-slate-500 font-medium">Tutor is thinking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        {messages.length <= 3 && !loading && (
          <div className="px-4 py-2 bg-slate-50/60 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
              Suggestions:
            </span>
            {QUICK_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(prompt)}
                className="shrink-0 text-[11px] font-medium px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-purple-400 text-slate-700 dark:text-slate-300 transition"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Input Form */}
        <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-end gap-2 bg-slate-50 dark:bg-slate-800/70 p-2 rounded-2xl border border-slate-200 dark:border-slate-700/80 focus-within:border-purple-500 focus-within:ring-1 focus-within:ring-purple-500 transition"
          >
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask any question or doubt about "${topicTitle}"...`}
              className="flex-1 max-h-28 bg-transparent text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 resize-none outline-hidden px-2 py-1.5"
            />

            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl shadow-xs transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              title="Send question"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <p className="text-[10px] text-slate-400 text-center mt-2">
            Ask doubts, solve problems, or request practice questions tailored to this syllabus topic.
          </p>
        </div>
      </div>
    </div>
  );
};
