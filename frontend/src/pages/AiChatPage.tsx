import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  Trash2,
  BookOpen,
  HelpCircle,
  Code2,
  FileText,
  Loader2,
  User,
  Bot,
  ChevronDown
} from 'lucide-react';
import api from '../services/api';
import { Subject } from '../types';
import { useToast } from '../contexts/ToastContext';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export const AiChatPage: React.FC = () => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load user subjects for scope filter
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await api.get('/subjects');
        if (res.data.success && Array.isArray(res.data.subjects)) {
          setSubjects(res.data.subjects);
        }
      } catch (err) {
        console.error('Failed to fetch subjects for AI chat', err);
      }
    };
    fetchSubjects();
  }, []);

  // Load chat history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('studytrack_ai_tutor_messages');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      } catch {
        // ignore
      }
    }
    // Default initial greeting message
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: `👋 Hello! I am your personal 1-on-1 AI Study Tutor.\n\nAsk me any doubt, request step-by-step math or engineering proofs, ask for exam revision cheat-sheets, or practice questions!\n\nYou can also select a specific subject above to ground our discussion directly in your syllabus.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  }, []);

  const saveMessages = (msgs: ChatMessage[]) => {
    setMessages(msgs);
    localStorage.setItem('studytrack_ai_tutor_messages', JSON.stringify(msgs));
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (overridePrompt?: string) => {
    const textToSend = (overridePrompt || input).trim();
    if (!textToSend || loading) return;

    const userMessage: ChatMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedMessages = [...messages, userMessage];
    saveMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const payloadMessages = updatedMessages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({
          role: m.role,
          content: m.content
        }));

      const res = await api.post('/ai/chat-topic', {
        subjectId: selectedSubjectId !== 'all' ? selectedSubjectId : undefined,
        messages: payloadMessages
      });

      if (res.data.success && res.data.reply) {
        const assistantMsg: ChatMessage = {
          id: `ai_${Date.now()}`,
          role: 'assistant',
          content: res.data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        saveMessages([...updatedMessages, assistantMsg]);
      } else {
        throw new Error(res.data.message || 'Failed to get tutor reply');
      }
    } catch (err: any) {
      toast(err.response?.data?.message || err.message || 'Error communicating with AI tutor', 'error');
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: `⚠️ Sorry, I could not complete that request: ${
          err.response?.data?.message || err.message || 'Please check your connection and try again.'
        }`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      saveMessages([...updatedMessages, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    if (window.confirm('Clear your conversation history with AI Tutor?')) {
      const reset: ChatMessage[] = [
        {
          id: 'welcome',
          role: 'assistant',
          content: `Chat cleared. Ask me any study doubt or concept whenever you are ready!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ];
      saveMessages(reset);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Quick suggestion chips
  const quickPrompts = [
    { label: 'Explain simply', text: 'Explain the core principles and architecture of this concept with a simple real-world analogy.' },
    { label: 'Exam questions', text: 'What are the top 5 most important exam questions asked on this topic with key answers?' },
    { label: 'Quick quiz', text: 'Give me 3 practice multiple-choice questions to test my understanding of this topic.' },
    { label: 'Cheat-sheet', text: 'Provide a concise formula and key takeaways cheat-sheet for rapid revision.' }
  ];

  // Helper to format bold **text** and preserve line breaks
  const renderMessageContent = (text: string) => {
    return text.split('\n').map((line, lIdx) => {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={lIdx} className={line.trim() === '' ? 'h-2' : 'min-h-[1.25rem]'}>
          {parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={pIdx} className="font-bold text-slate-900 dark:text-white">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            return <React.Fragment key={pIdx}>{part}</React.Fragment>;
          })}
        </p>
      );
    });
  };

  const selectedSubject = subjects.find(s => s._id === selectedSubjectId);

  return (
    <div className="h-[calc(100vh-5rem)] md:h-[calc(100vh-3.5rem)] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden animate-in fade-in">
      {/* Top Header */}
      <div className="px-4 sm:px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-900/60 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 dark:text-white">
                AI Study Tutor
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                1-on-1 Doubts
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Personalized syllabus doubt clearance, problem solving & revision
            </p>
          </div>
        </div>

        {/* Subject Scope Selector & Clear Chat */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="appearance-none pl-8 pr-8 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-purple-400 focus:ring-2 focus:ring-purple-500 outline-hidden transition cursor-pointer shadow-2xs"
            >
              <option value="all">🌐 All Subjects (General Tutor)</option>
              {subjects.map((sub) => (
                <option key={sub._id} value={sub._id}>
                  📚 {sub.name}
                </option>
              ))}
            </select>
            <BookOpen className="w-3.5 h-3.5 text-purple-600 absolute left-2.5 top-2.5 pointer-events-none" />
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          <button
            type="button"
            onClick={handleClearChat}
            className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
            title="Clear conversation"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scope Banner if subject is selected */}
      {selectedSubject && (
        <div className="px-5 py-2 bg-purple-50/70 dark:bg-purple-950/30 border-b border-purple-100 dark:border-purple-900/50 flex items-center justify-between text-xs text-purple-700 dark:text-purple-300">
          <span className="flex items-center gap-1.5 font-medium truncate">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: selectedSubject.color || '#8B5CF6' }}
            />
            Grounded in: <strong>{selectedSubject.name}</strong> syllabus & notes
          </span>
          <button
            type="button"
            onClick={() => setSelectedSubjectId('all')}
            className="text-[11px] font-semibold underline hover:text-purple-900 dark:hover:text-purple-100"
          >
            Reset to General
          </button>
        </div>
      )}

      {/* Chat Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold shadow-2xs ${
                  isUser
                    ? 'bg-blue-600 text-white'
                    : 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[88%] sm:max-w-[80%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
                  isUser
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/60 dark:border-slate-700/60'
                }`}
              >
                <div className="space-y-1">
                  {isUser ? (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  ) : (
                    renderMessageContent(msg.content)
                  )}
                </div>
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

        {/* Loading Bubble */}
        {loading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
              <span className="text-xs text-slate-500 font-medium">Tutor is preparing explanation...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Chips */}
      <div className="px-4 sm:px-6 py-2 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5 text-purple-500" /> Prompts:
        </span>
        {quickPrompts.map((q, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSend(q.text)}
            disabled={loading}
            className="text-xs font-medium px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700 text-slate-700 dark:text-slate-300 hover:text-purple-600 transition shrink-0 disabled:opacity-50"
          >
            {q.label}
          </button>
        ))}
      </div>

      {/* Input Composer */}
      <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
        <div className="relative flex items-end gap-2">
          <textarea
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask any doubt, concept explanation, or exam tip... (Press Enter to send)"
            disabled={loading}
            className="w-full resize-none p-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-purple-500 outline-hidden transition"
          />
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="px-4 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold flex items-center justify-center transition shadow-md shadow-purple-500/20 shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
