/**
 * Vanilla JavaScript Frontend Client
 * Berkomunikasi dengan Express REST API (/api/chat, /api/conversations)
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const conversationListEl = document.getElementById('conversation-list');
  const chatMessagesEl = document.getElementById('chat-messages');
  const chatInputEl = document.getElementById('chat-input');
  const sendBtnEl = document.getElementById('send-btn');
  const newChatBtnEl = document.getElementById('new-chat-btn');
  const searchInputEl = document.getElementById('search-input');
  const themeToggleBtn = document.getElementById('theme-toggle');
  const chatTitleEl = document.getElementById('current-chat-title');
  const statusBadgeEl = document.getElementById('status-badge');

  let currentConversationId = null;
  let isSending = false;

  // Theme Management
  const currentTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', currentTheme);

  themeToggleBtn.addEventListener('click', () => {
    const active = document.documentElement.getAttribute('data-theme');
    const newTheme = active === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  });

  // Fetch System Status
  async function checkSystemStatus() {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      if (data.success) {
        statusBadgeEl.textContent = data.isGeminiConfigured 
          ? `🟢 Gemini (${data.model})` 
          : `🟡 Mode Demo (Simulasi)`;
      }
    } catch {
      statusBadgeEl.textContent = 'Offline';
    }
  }

  // Load Conversations
  async function loadConversations(search = '') {
    try {
      const url = search ? `/api/conversations?search=${encodeURIComponent(search)}` : '/api/conversations';
      const res = await fetch(url);
      const result = await res.json();

      conversationListEl.innerHTML = '';
      if (!result.data || result.data.length === 0) {
        conversationListEl.innerHTML = `<div style="padding: 1rem; color: var(--text-secondary); font-size: 0.85rem; text-align: center;">Belum ada riwayat</div>`;
        return;
      }

      result.data.forEach((conv) => {
        const item = document.createElement('div');
        item.className = `conversation-item ${conv.id === currentConversationId ? 'active' : ''}`;
        item.innerHTML = `
          <div class="conversation-title" title="${escapeHtml(conv.title)}">💬 ${escapeHtml(conv.title)}</div>
          <button class="btn-delete-item" data-id="${conv.id}" title="Hapus">✕</button>
        `;

        item.addEventListener('click', (e) => {
          if (e.target.classList.contains('btn-delete-item')) {
            e.stopPropagation();
            deleteConversation(conv.id);
            return;
          }
          selectConversation(conv.id);
        });

        conversationListEl.appendChild(item);
      });
    } catch (err) {
      console.error('Gagal memuat percakapan:', err);
    }
  }

  // Select Conversation
  async function selectConversation(id) {
    currentConversationId = id;
    loadConversations(searchInputEl.value);

    try {
      const res = await fetch(`/api/conversations/${id}`);
      const data = await res.json();

      if (!data.success) return;

      chatTitleEl.textContent = data.conversation.title;
      renderMessages(data.messages);
    } catch (err) {
      console.error('Gagal mengambil pesan:', err);
    }
  }

  // Render Messages
  function renderMessages(messages) {
    chatMessagesEl.innerHTML = '';

    if (!messages || messages.length === 0) {
      showWelcomeScreen();
      return;
    }

    messages.forEach((msg) => {
      appendMessageToUI(msg.sender, msg.text, msg.created_at, msg.id);
    });

    scrollToBottom();
  }

  // Welcome Screen
  function showWelcomeScreen() {
    chatMessagesEl.innerHTML = `
      <div class="welcome-screen">
        <h2 class="welcome-title">Selamat Datang di Node.js AI Chatbot! 🤖</h2>
        <p class="welcome-subtitle">Aplikasi percakapan cerdas yang terintegrasi dengan Express.js, SQLite, dan Gemini AI. Pilih topik atau ketik pesan Anda di bawah:</p>
        <div class="suggestion-grid">
          <div class="suggestion-card" data-prompt="Jelaskan konsep arsitektur RESTful API di Node.js">
            <strong>🌐 Node.js REST API</strong><br>
            Jelaskan struktur dan praktik terbaik membuat REST API.
          </div>
          <div class="suggestion-card" data-prompt="Bagaimana cara kerja SQLite di Node.js 22?">
            <strong>🗄️ SQLite Database</strong><br>
            Pelajari penyimpanan data lokal cepat tanpa setup server SQL.
          </div>
          <div class="suggestion-card" data-prompt="Tulis contoh middleware Express untuk menangani error terpusat">
            <strong>🛡️ Middleware Express</strong><br>
            Buat error handler terpusat dengan response JSON aman.
          </div>
          <div class="suggestion-card" data-prompt="Jelaskan cara integrasi model Gemini 3.8 Flash di server-side">
            <strong>⚡ Integrasi Gemini AI</strong><br>
            Pelajari penggunaan @google/genai SDK di backend.
          </div>
        </div>
      </div>
    `;

    document.querySelectorAll('.suggestion-card').forEach((card) => {
      card.addEventListener('click', () => {
        const prompt = card.getAttribute('data-prompt');
        chatInputEl.value = prompt;
        sendMessage();
      });
    });
  }

  // Append Message to UI
  function appendMessageToUI(sender, text, timestamp = Date.now(), msgId = '') {
    // Remove welcome screen if present
    const welcome = document.querySelector('.welcome-screen');
    if (welcome) welcome.remove();

    const row = document.createElement('div');
    row.className = `message-row ${sender}`;
    if (msgId) row.id = msgId;

    const formattedTime = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const formattedContent = renderMarkdown(text);

    row.innerHTML = `
      <div class="message-avatar ${sender}-avatar">${sender === 'user' ? 'U' : 'AI'}</div>
      <div class="message-content">
        <div class="message-bubble">${formattedContent}</div>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span class="message-time">${formattedTime}</span>
          ${sender === 'bot' ? `<button class="btn-copy" onclick="copyText(this)">📋 Salin</button>` : ''}
        </div>
      </div>
    `;

    chatMessagesEl.appendChild(row);
    scrollToBottom();
  }

  // Show Typing Indicator
  function showTypingIndicator() {
    const row = document.createElement('div');
    row.className = 'message-row bot';
    row.id = 'typing-indicator-row';
    row.innerHTML = `
      <div class="message-avatar bot-avatar">AI</div>
      <div class="message-content">
        <div class="message-bubble typing-indicator">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      </div>
    `;
    chatMessagesEl.appendChild(row);
    scrollToBottom();
  }

  function removeTypingIndicator() {
    const el = document.getElementById('typing-indicator-row');
    if (el) el.remove();
  }

  // Send Message
  async function sendMessage() {
    const text = chatInputEl.value.trim();
    if (!text || isSending) return;

    isSending = true;
    sendBtnEl.disabled = true;
    chatInputEl.value = '';
    chatInputEl.style.height = 'auto';

    // Tampilkan pesan pengguna di UI
    appendMessageToUI('user', text);
    showTypingIndicator();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: currentConversationId,
          message: text,
        }),
      });

      const data = await response.json();
      removeTypingIndicator();

      if (data.success) {
        currentConversationId = data.conversationId;
        appendMessageToUI('bot', data.botMessage.text, data.botMessage.created_at, data.botMessage.id);
        loadConversations(searchInputEl.value);
      } else {
        appendMessageToUI('bot', `⚠️ Terjadi kesalahan: ${data.error || 'Gagal memproses pesan.'}`);
      }
    } catch (err) {
      removeTypingIndicator();
      appendMessageToUI('bot', '⚠️ Terjadi kesalahan jaringan. Pastikan server aktif.');
      console.error(err);
    } finally {
      isSending = false;
      sendBtnEl.disabled = false;
      chatInputEl.focus();
    }
  }

  // Delete Conversation
  async function deleteConversation(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus percakapan ini?')) return;
    try {
      await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
      if (currentConversationId === id) {
        currentConversationId = null;
        chatTitleEl.textContent = 'Percakapan Baru';
        showWelcomeScreen();
      }
      loadConversations(searchInputEl.value);
    } catch (err) {
      console.error('Gagal menghapus percakapan:', err);
    }
  }

  // Event Listeners
  sendBtnEl.addEventListener('click', sendMessage);

  chatInputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Auto-resize textarea
  chatInputEl.addEventListener('input', () => {
    chatInputEl.style.height = 'auto';
    chatInputEl.style.height = Math.min(chatInputEl.scrollHeight, 160) + 'px';
  });

  newChatBtnEl.addEventListener('click', () => {
    currentConversationId = null;
    chatTitleEl.textContent = 'Percakapan Baru';
    showWelcomeScreen();
    loadConversations();
    chatInputEl.focus();
  });

  searchInputEl.addEventListener('input', (e) => {
    loadConversations(e.target.value);
  });

  function scrollToBottom() {
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
  }

  // Simple Markdown Parser & Sanitizer
  function renderMarkdown(text) {
    if (!text) return '';
    let escaped = escapeHtml(text);

    // Code blocks ```lang\ncode\n```
    escaped = escaped.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_match, _lang, code) => {
      return `<pre><code>${code.trim()}</code></pre>`;
    });

    // Inline code `code`
    escaped = escaped.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold **text**
    escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Italic *text*
    escaped = escaped.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Line breaks
    escaped = escaped.replace(/\n/g, '<br>');

    return escaped;
  }

  function escapeHtml(string) {
    const div = document.createElement('div');
    div.innerText = string;
    return div.innerHTML;
  }

  // Global helper for copy
  window.copyText = function(btn) {
    const bubble = btn.closest('.message-content').querySelector('.message-bubble');
    if (bubble) {
      navigator.clipboard.writeText(bubble.innerText).then(() => {
        btn.textContent = '✓ Tersalin!';
        setTimeout(() => { btn.textContent = '📋 Salin'; }, 2000);
      });
    }
  };

  // Init
  checkSystemStatus();
  loadConversations();
  showWelcomeScreen();
});
