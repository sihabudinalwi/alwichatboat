/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Plus,
  Trash2,
  Send,
  Search,
  Settings,
  Moon,
  Sun,
  Copy,
  Check,
  RotateCcw,
  Bot,
  User,
  Sparkles,
  Database,
  Code2,
  Terminal,
  ShieldCheck,
  Menu,
  X,
  AlertCircle,
  ExternalLink
} from 'lucide-react';

interface Conversation {
  id: string;
  title: string;
  created_at: number;
  updated_at: number;
  system_prompt?: string;
  message_count?: number;
  last_message?: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender: 'user' | 'bot' | 'system';
  text: string;
  created_at: number;
  status: 'sent' | 'error';
}

interface SystemStatus {
  isGeminiConfigured: boolean;
  model: string;
  database: string;
  stats: {
    conversationsCount: number;
    messagesCount: number;
  };
}

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('Anda adalah asisten AI yang ramah, cerdas, dan ahli dalam Node.js serta pengembangan web.');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Inisialisasi tema
  useEffect(() => {
    const savedTheme = localStorage.getItem('chatbot_theme');
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = !isDarkMode;
    setIsDarkMode(nextTheme);
    localStorage.setItem('chatbot_theme', nextTheme ? 'dark' : 'light');
  };

  // Muat status sistem & riwayat percakapan saat awal
  useEffect(() => {
    fetchSystemStatus();
    fetchConversations();
  }, []);

  // Scroll otomatis ke pesan terbaru
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Muat status API & Database
  const fetchSystemStatus = async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      if (data.success) {
        setSystemStatus(data);
      }
    } catch (err) {
      console.error('Gagal mengambil status sistem:', err);
    }
  };

  // Muat daftar percakapan
  const fetchConversations = async (search = '') => {
    try {
      const url = search ? `/api/conversations?search=${encodeURIComponent(search)}` : '/api/conversations';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setConversations(data.data);
      }
    } catch (err) {
      console.error('Gagal memuat percakapan:', err);
    }
  };

  // Pilih percakapan aktif
  const selectConversation = async (id: string) => {
    setActiveConversationId(id);
    setIsSidebarOpen(false);
    try {
      const res = await fetch(`/api/conversations/${id}`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error('Gagal memuat detail percakapan:', err);
    }
  };

  // Mulai percakapan baru
  const handleNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    setInputMessage('');
    setIsSidebarOpen(false);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Hapus percakapan tertentu
  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Hapus percakapan ini secara permanen dari database SQLite?')) return;

    try {
      const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (activeConversationId === id) {
          handleNewChat();
        }
        fetchConversations(searchQuery);
        fetchSystemStatus();
      }
    } catch (err) {
      console.error('Gagal menghapus percakapan:', err);
    }
  };

  // Hapus semua riwayat
  const handleClearAll = async () => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus SEMUA riwayat percakapan dari database SQLite?')) return;
    try {
      await fetch('/api/conversations', { method: 'DELETE' });
      handleNewChat();
      fetchConversations();
      fetchSystemStatus();
    } catch (err) {
      console.error('Gagal menghapus semua percakapan:', err);
    }
  };

  // Kirim pesan ke API
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    setInputMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const tempUserMsgId = `temp_${Date.now()}`;
    const optimisticUserMsg: Message = {
      id: tempUserMsgId,
      conversation_id: activeConversationId || '',
      sender: 'user',
      text,
      created_at: Date.now(),
      status: 'sent',
    };

    setMessages((prev) => [...prev, optimisticUserMsg]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: activeConversationId,
          message: text,
          systemPrompt,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setActiveConversationId(data.conversationId);
        // Perbarui pesan dengan data valid dari database
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== tempUserMsgId),
          data.userMessage,
          data.botMessage,
        ]);
        fetchConversations(searchQuery);
        fetchSystemStatus();
      } else {
        const errorBotMsg: Message = {
          id: `err_${Date.now()}`,
          conversation_id: activeConversationId || '',
          sender: 'bot',
          text: `⚠️ **Gagal mengirim pesan**: ${data.error || 'Terjadi kesalahan sistem.'}`,
          created_at: Date.now(),
          status: 'error',
        };
        setMessages((prev) => [...prev, errorBotMsg]);
      }
    } catch (err) {
      console.error('Error saat mengirim pesan:', err);
      const networkErrorMsg: Message = {
        id: `err_${Date.now()}`,
        conversation_id: activeConversationId || '',
        sender: 'bot',
        text: '⚠️ **Koneksi terputus**: Gagal menghubungi server backend Node.js. Pastikan server tetap berjalan.',
        created_at: Date.now(),
        status: 'error',
      };
      setMessages((prev) => [...prev, networkErrorMsg]);
    } finally {
      setIsLoading(false);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  };

  // Keyboard shortcut: Enter untuk kirim, Shift+Enter untuk baris baru
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
  };

  // Salin teks pesan
  const handleCopyText = (text: string, msgId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Salin blok kode program
  const handleCopyCode = (code: string, blockId: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(blockId);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  // Format pesan Markdown sederhana dan bersih
  const renderFormattedMessage = (content: string, msgId: string) => {
    // Pisahkan kode program ```...```
    const parts = content.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const lines = part.slice(3, -3).trim().split('\n');
        const language = lines[0].match(/^[a-zA-Z0-9_-]+$/) ? lines[0] : 'code';
        const codeContent = language === lines[0] ? lines.slice(1).join('\n') : lines.join('\n');
        const blockId = `${msgId}_code_${index}`;

        return (
          <div key={index} className="my-3 rounded-lg overflow-hidden border border-slate-700/60 bg-slate-950 font-mono text-xs sm:text-sm">
            <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-900 border-b border-slate-800 text-slate-400">
              <span className="flex items-center gap-1.5 font-semibold text-xs tracking-wide uppercase text-blue-400">
                <Terminal className="w-3.5 h-3.5" />
                {language}
              </span>
              <button
                onClick={() => handleCopyCode(codeContent, blockId)}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer py-0.5 px-2 rounded hover:bg-slate-800"
                title="Salin kode ini"
              >
                {copiedCodeId === blockId ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Salin</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3.5 overflow-x-auto text-slate-200 leading-relaxed scrollbar-thin">
              <code>{codeContent}</code>
            </pre>
          </div>
        );
      }

      // Format teks biasa: bold, italic, list, quotes
      const paragraphs = part.split('\n');
      return (
        <div key={index} className="space-y-1.5">
          {paragraphs.map((line, pIdx) => {
            if (!line.trim()) return <div key={pIdx} className="h-1.5" />;

            // List item bullet
            if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
              return (
                <div key={pIdx} className="flex items-start gap-2 pl-2">
                  <span className="text-blue-400 mt-1.5 text-xs">•</span>
                  <span>{parseInlineFormatting(line.replace(/^[*\-]\s+/, ''))}</span>
                </div>
              );
            }

            // Blockquote
            if (line.trim().startsWith('> ')) {
              return (
                <blockquote key={pIdx} className="border-l-2 border-blue-500 pl-3 py-1 my-1 italic text-slate-400 bg-blue-500/5 rounded-r">
                  {parseInlineFormatting(line.replace(/^>\s+/, ''))}
                </blockquote>
              );
            }

            // Headers
            if (line.startsWith('### ')) {
              return <h3 key={pIdx} className="font-bold text-base mt-2 mb-1 text-blue-400">{line.replace('### ', '')}</h3>;
            }
            if (line.startsWith('## ')) {
              return <h2 key={pIdx} className="font-bold text-lg mt-3 mb-1 text-blue-300">{line.replace('## ', '')}</h2>;
            }

            return <p key={pIdx} className="leading-relaxed">{parseInlineFormatting(line)}</p>;
          })}
        </div>
      );
    });
  };

  // Format bold (**), italic (*), dan inline code (`)
  const parseInlineFormatting = (text: string) => {
    const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return tokens.map((token, idx) => {
      if (token.startsWith('`') && token.endsWith('`')) {
        return (
          <code key={idx} className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 font-mono text-xs border border-blue-500/20">
            {token.slice(1, -1)}
          </code>
        );
      }
      if (token.startsWith('**') && token.endsWith('**')) {
        return <strong key={idx} className="font-semibold text-white">{token.slice(2, -2)}</strong>;
      }
      if (token.startsWith('*') && token.endsWith('*')) {
        return <em key={idx} className="italic text-slate-300">{token.slice(1, -1)}</em>;
      }
      return token;
    });
  };

  // Contoh pertanyaan untuk layar sambutan
  const suggestions = [
    {
      title: 'Arsitektur RESTful API',
      prompt: 'Jelaskan bagaimana struktur folder dan alur request REST API pada Node.js Express.',
      category: 'Backend',
    },
    {
      title: 'Database SQLite di Node 22',
      prompt: 'Bagaimana cara menggunakan modul bawaan node:sqlite di Node.js versi 22 tanpa package eksternal?',
      category: 'Database',
    },
    {
      title: 'Middleware Express Aman',
      prompt: 'Buatlah contoh middleware Express untuk menangani otentikasi Bearer Token dan centralized error handling.',
      category: 'Security',
    },
    {
      title: 'Integrasi Google Gemini',
      prompt: 'Jelaskan cara kerja SDK @google/genai di sisi server Node.js dan cara mengirim context riwayat percakapan.',
      category: 'AI Model',
    },
  ];

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  return (
    <div className={`flex h-screen w-full transition-colors duration-200 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Overlay Backdrop untuk Sidebar di layar mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-xs"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 w-72 sm:w-80 flex flex-col border-r transition-transform duration-300 ease-in-out ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        } ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Header Sidebar */}
        <div className={`p-4 flex items-center justify-between border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-tight leading-tight">Node.js AI Chatbot</h1>
              <p className="text-[11px] text-blue-400 font-medium">Express • SQLite • Gemini</p>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tombol Buat Percakapan Baru */}
        <div className="p-3">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all shadow-sm shadow-blue-600/30 active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Percakapan Baru</span>
          </button>
        </div>

        {/* Input Pencarian Riwayat */}
        <div className="px-3 pb-2">
          <div className={`relative flex items-center rounded-lg border ${
            isDarkMode ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            <Search className="w-4 h-4 ml-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari riwayat percakapan..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                fetchConversations(e.target.value);
              }}
              className="w-full py-1.5 px-2.5 text-xs bg-transparent focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  fetchConversations('');
                }}
                className="mr-2 text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Daftar Riwayat Percakapan (SQLite) */}
        <div className="flex-1 overflow-y-auto px-2 space-y-1 scrollbar-thin">
          <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Riwayat SQLite ({conversations.length})</span>
            {conversations.length > 0 && (
              <button
                onClick={handleClearAll}
                className="text-[10px] text-red-400 hover:text-red-300 transition-colors"
                title="Hapus semua riwayat"
              >
                Hapus Semua
              </button>
            )}
          </div>

          {conversations.length === 0 ? (
            <div className="py-8 px-4 text-center text-xs text-slate-400">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
              {searchQuery ? 'Tidak ada hasil ditemukan' : 'Belum ada percakapan tersimpan'}
            </div>
          ) : (
            conversations.map((conv) => {
              const isActive = conv.id === activeConversationId;
              return (
                <div
                  key={conv.id}
                  onClick={() => selectConversation(conv.id)}
                  className={`group relative flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer transition-all ${
                    isActive
                      ? isDarkMode
                        ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30 font-medium'
                        : 'bg-blue-50 text-blue-700 border border-blue-200 font-medium'
                      : isDarkMode
                      ? 'text-slate-300 hover:bg-slate-800/60'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden mr-2">
                    <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                    <span className="truncate">{conv.title}</span>
                  </div>

                  <button
                    onClick={(e) => handleDeleteConversation(e, conv.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-400 transition-all rounded hover:bg-red-500/10 cursor-pointer"
                    title="Hapus percakapan ini"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Sidebar: Status, Theme Toggle, Settings */}
        <div className={`p-3 border-t space-y-2 ${isDarkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50'}`}>
          <div className="flex items-center justify-between text-xs">
            <button
              onClick={toggleTheme}
              className={`flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg border transition-colors cursor-pointer ${
                isDarkMode
                  ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                  : 'border-slate-300 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-600" />}
              <span>{isDarkMode ? 'Mode Terang' : 'Mode Gelap'}</span>
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-200'
              }`}
              title="Pengaturan Chatbot"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

          {/* Badge status AI Engine */}
          <div className={`p-2 rounded-lg text-[11px] flex items-center justify-between ${
            systemStatus?.isGeminiConfigured
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          }`}>
            <span className="flex items-center gap-1.5 font-medium truncate">
              <span className={`w-2 h-2 rounded-full ${systemStatus?.isGeminiConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              {systemStatus?.isGeminiConfigured ? `${systemStatus.model} Aktif` : 'Mode Demo (Simulasi)'}
            </span>
            <Database className="w-3.5 h-3.5 opacity-70 flex-shrink-0" />
          </div>
        </div>
      </aside>

      {/* MAIN CHAT AREA */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header Percakapan */}
        <header className={`px-4 py-3 border-b flex items-center justify-between z-10 ${
          isDarkMode ? 'bg-slate-900/80 border-slate-800 backdrop-blur-md' : 'bg-white/80 border-slate-200 backdrop-blur-md'
        }`}>
          <div className="flex items-center gap-3 overflow-hidden">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="overflow-hidden">
              <h2 className="font-semibold text-sm truncate">
                {activeConversation ? activeConversation.title : 'Percakapan Baru'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {activeConversation
                  ? `${messages.length} pesan • Tersimpan di SQLite`
                  : 'Mulai percakapan dengan mengetik di bawah'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeConversationId && (
              <button
                onClick={handleNewChat}
                className={`text-xs flex items-center gap-1 py-1.5 px-2.5 rounded-lg border transition-colors cursor-pointer ${
                  isDarkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-300 hover:bg-slate-100'
                }`}
                title="Mulai sesi baru"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sesi Baru</span>
              </button>
            )}
          </div>
        </header>

        {/* Area Pesan Chat */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 scrollbar-thin">
          {messages.length === 0 ? (
            /* Welcome Hero / Empty State */
            <div className="max-w-2xl mx-auto py-8 sm:py-12 px-4 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-xl shadow-blue-500/25">
                <Sparkles className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight mb-2">
                Selamat Datang di Node.js Chatbot
              </h2>
              <p className="text-sm text-slate-400 max-w-md mx-auto mb-8 leading-relaxed">
                Aplikasi asisten cerdas berarsitektur full-stack Node.js & Express dengan database lokal SQLite dan integrasi model Google Gemini.
              </p>

              {/* Suggestions Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                {suggestions.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(item.prompt)}
                    className={`p-3.5 rounded-xl border transition-all text-left group cursor-pointer ${
                      isDarkMode
                        ? 'bg-slate-900/60 border-slate-800 hover:border-blue-500/40 hover:bg-slate-800/40'
                        : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">
                        {item.category}
                      </span>
                      <Sparkles className="w-3 h-3 text-slate-400 group-hover:text-blue-400 transition-colors" />
                    </div>
                    <div className="font-medium text-xs sm:text-sm mb-1">{item.title}</div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{item.prompt}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Message Thread */
            messages.map((msg) => {
              const isUser = msg.sender === 'user';
              const formattedTime = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold shadow-xs ${
                      isUser
                        ? 'bg-blue-600 text-white'
                        : 'bg-gradient-to-tr from-indigo-600 to-blue-500 text-white'
                    }`}
                  >
                    {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  {/* Bubble Content */}
                  <div className={`flex flex-col gap-1 max-w-[85%] sm:max-w-[78%] ${isUser ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`p-3.5 sm:p-4 rounded-2xl text-sm leading-relaxed shadow-xs relative group ${
                        isUser
                          ? 'bg-blue-600 text-white rounded-tr-xs'
                          : isDarkMode
                          ? 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-xs'
                          : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs'
                      }`}
                    >
                      {renderFormattedMessage(msg.text, msg.id)}
                    </div>

                    {/* Metadata & Actions */}
                    <div className="flex items-center gap-2 px-1 text-[11px] text-slate-400">
                      <span>{formattedTime}</span>
                      {!isUser && (
                        <button
                          onClick={() => handleCopyText(msg.text, msg.id)}
                          className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                          title="Salin jawaban ini"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Tersalin</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Salin</span>
                            </>
                          )}
                        </button>
                      )}
                      {msg.status === 'error' && (
                        <span className="text-red-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Gagal
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Typing Indicator / Animasi Chatbot sedang memproses */}
          {isLoading && (
            <div className="flex gap-3 max-w-3xl mr-auto animate-fade-in">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center flex-shrink-0 text-white">
                <Bot className="w-4 h-4" />
              </div>
              <div className={`p-4 rounded-2xl rounded-tl-xs border text-xs flex items-center gap-2 ${
                isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-600'
              }`}>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-[11px] text-slate-400 ml-1">AI sedang menyusun jawaban...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar di bagian bawah */}
        <div className={`p-3 sm:p-4 border-t ${
          isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="max-w-3xl mx-auto">
            <div
              className={`relative flex items-end gap-2 p-2 sm:p-2.5 rounded-2xl border transition-all ${
                isDarkMode
                  ? 'bg-slate-950 border-slate-800 focus-within:border-blue-500/80 focus-within:ring-2 focus-within:ring-blue-500/20'
                  : 'bg-slate-50 border-slate-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10'
              }`}
            >
              <textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Ketik pesan Anda di sini... (Enter untuk kirim, Shift+Enter untuk baris baru)"
                rows={1}
                disabled={isLoading}
                className="w-full resize-none bg-transparent px-2 py-1 text-sm focus:outline-none max-h-44 min-h-[26px] scrollbar-thin"
              />

              <button
                onClick={() => handleSendMessage()}
                disabled={!inputMessage.trim() || isLoading}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white transition-all flex-shrink-0 cursor-pointer disabled:cursor-not-allowed shadow-sm shadow-blue-600/30 active:scale-95"
                title="Kirim pesan"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Backend Node.js & SQLite aktif
              </span>
              <span>{inputMessage.length} / 8000 karakter</span>
            </div>
          </div>
        </div>
      </main>

      {/* PENGATURAN MODAL (Persona / System Prompt / Database Stats) */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className={`w-full max-w-md rounded-2xl border p-5 sm:p-6 space-y-4 shadow-2xl ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-800">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-base">Pengaturan Chatbot</h3>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Persona Preset */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Instruksi Sistem (System Prompt)
              </label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={3}
                className={`w-full p-2.5 rounded-xl border text-xs focus:outline-none ${
                  isDarkMode ? 'bg-slate-950 border-slate-800 focus:border-blue-500' : 'bg-slate-50 border-slate-200 focus:border-blue-500'
                }`}
              />
            </div>

            {/* Tombol Preset Cepat */}
            <div className="space-y-1">
              <span className="text-[11px] text-slate-400">Preset Karakter Cepat:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { name: 'Software Engineer', prompt: 'Anda adalah Senior Software Engineer yang ahli dalam Node.js, Express, TypeScript, dan arsitektur backend.' },
                  { name: 'Ringkas & Padat', prompt: 'Jawab semua pertanyaan dengan sangat ringkas, padat, dan langsung ke inti tanpa basa-basi.' },
                  { name: 'Guru Sabar', prompt: 'Jelaskan setiap konsep secara terstruktur ramah untuk pemula dengan analogi kehidupan sehari-hari.' },
                ].map((preset, i) => (
                  <button
                    key={i}
                    onClick={() => setSystemPrompt(preset.prompt)}
                    className="text-[11px] py-1 px-2.5 rounded-lg border border-slate-700 bg-slate-800/50 hover:bg-slate-800 text-blue-300 transition-colors cursor-pointer"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Info Status Database & API Key */}
            <div className={`p-3 rounded-xl border text-xs space-y-2 ${
              isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="font-semibold text-blue-400 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" />
                Informasi Arsitektur Sistem
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                <div>Backend: <span className="text-slate-200 font-medium">Node.js + Express</span></div>
                <div>Database: <span className="text-slate-200 font-medium">SQLite (node:sqlite)</span></div>
                <div>Model AI: <span className="text-slate-200 font-medium">{systemStatus?.model || 'gemini-3.8-flash'}</span></div>
                <div>Tersimpan: <span className="text-slate-200 font-medium">{systemStatus?.stats.conversationsCount || 0} Percakapan</span></div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer"
              >
                Simpan & Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
