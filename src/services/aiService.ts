/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from '@google/genai';
import { DBMessage } from '../config/database.ts';

export interface ChatResponseResult {
  text: string;
  isDemoMode: boolean;
  model: string;
  error?: string;
}

class AIService {
  private client: GoogleGenAI | null = null;
  private defaultModel = 'gemini-3.1-flash-lite';
  private fallbackModel = 'gemini-3.8-flash';

  constructor() {
    this.initClient();
  }

  private initClient(): void {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey.trim() !== '' && apiKey !== 'MY_GEMINI_API_KEY') {
      try {
        this.client = new GoogleGenAI({
          apiKey: apiKey.trim(),
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });
      } catch (err) {
        console.error('Failed to initialize GoogleGenAI client:', err);
        this.client = null;
      }
    } else {
      this.client = null;
    }
  }

  public isConfigured(): boolean {
    const apiKey = process.env.GEMINI_API_KEY;
    return !!(apiKey && apiKey.trim() !== '' && apiKey !== 'MY_GEMINI_API_KEY');
  }

  public getModelName(): string {
    return this.defaultModel;
  }

  /**
   * Menghasilkan balasan percakapan menggunakan Gemini API atau Demo Mode
   */
  public async generateReply(
    history: DBMessage[],
    newMessage: string,
    customSystemPrompt?: string
  ): Promise<ChatResponseResult> {
    // Re-check client in case environment variable was injected dynamically
    if (!this.client && this.isConfigured()) {
      this.initClient();
    }

    const systemPrompt =
      customSystemPrompt?.trim() ||
      'Anda adalah asisten AI yang ramah, cerdas, profesional, dan membantu. ' +
        'Berikan jawaban yang mendalam, jelas, dan akurat. ' +
        'Gunakan format Markdown dengan rapi untuk teks, daftar poin, dan blok kode dengan tanda bahasa pemrograman.';

    // Jika Gemini API Key tersedia, gunakan model Google Gemini asli
    if (this.client) {
      // Format riwayat percakapan untuk format contents @google/genai
      const contents: Array<{
        role: 'user' | 'model';
        parts: Array<{ text: string }>;
      }> = [];

      // Ambil konteks hingga 12 pesan terakhir agar efisien dan tetap relevan
      const recentHistory = history.slice(-12);

      for (const msg of recentHistory) {
        if (msg.sender === 'user') {
          contents.push({
            role: 'user',
            parts: [{ text: msg.text }],
          });
        } else if (msg.sender === 'bot') {
          contents.push({
            role: 'model',
            parts: [{ text: msg.text }],
          });
        }
      }

      // Tambahkan pesan pengguna saat ini
      contents.push({
        role: 'user',
        parts: [{ text: newMessage }],
      });

      // Coba model utama (gemini-3.1-flash-lite) yang cepat dan stabil
      const candidateModels = [this.defaultModel, this.fallbackModel];
      let lastError: unknown = null;

      for (const modelToTry of candidateModels) {
        try {
          const response = await this.client.models.generateContent({
            model: modelToTry,
            contents: contents,
            config: {
              systemInstruction: systemPrompt,
              temperature: 0.7,
            },
          });

          const outputText = response.text || 'Maaf, model tidak menghasilkan respons teks.';
          return {
            text: outputText,
            isDemoMode: false,
            model: modelToTry,
          };
        } catch (err) {
          lastError = err;
          console.warn(`Model ${modelToTry} gagal dipanggil, mencoba model cadangan jika ada...`, err);
        }
      }

      const errMsg = lastError instanceof Error ? lastError.message : String(lastError);
      return {
        text: `⚠️ **Gagal terhubung ke Gemini API**: ${errMsg}\n\n*Silakan periksa API key Anda di panel Secrets atau file \`.env\`.*`,
        isDemoMode: false,
        model: this.defaultModel,
        error: errMsg,
      };
    }

    // DEMO MODE: Ketika API key belum diatur di lingkungan
    return {
      text: this.generateDemoResponse(newMessage, history),
      isDemoMode: true,
      model: `${this.defaultModel} (Demo Simulation)`,
    };
  }

  /**
   * Simulasi respons cerdas untuk Demo Mode saat API key belum diisi
   */
  private generateDemoResponse(userPrompt: string, history: DBMessage[]): string {
    const lower = userPrompt.toLowerCase();

    if (lower.includes('halo') || lower.includes('hai') || lower.includes('assalamu')) {
      return (
        `Halo! Senang bertemu dengan Anda. 👋\n\n` +
        `Saya adalah **Node.js AI Chatbot** yang dibangun menggunakan arsitektur Express.js & SQLite.\n\n` +
        `💡 *Catatan Demo*: Saat ini aplikasi berjalan dalam **Mode Demo** karena \`GEMINI_API_KEY\` belum disetel di environment. Untuk mengaktifkan integrasi AI Google Gemini secara live, masukkan API key Anda ke file \`.env\` atau tab Secrets Google AI Studio.`
      );
    }

    if (lower.includes('node') || lower.includes('express') || lower.includes('kode') || lower.includes('code')) {
      return (
        `Berikut adalah contoh implementasi endpoint Express.js sederhana untuk server chatbot:\n\n` +
        `\`\`\`javascript\n` +
        `import express from 'express';\n` +
        `const app = express();\n\n` +
        `app.use(express.json());\n\n` +
        `app.post('/api/chat', (req, res) => {\n` +
        `  const { message } = req.body;\n` +
        `  if (!message) return res.status(400).json({ error: 'Pesan wajib diisi' });\n` +
        `  res.json({ reply: 'Pesan diterima: ' + message });\n` +
        `});\n\n` +
        `app.listen(3000, () => console.log('Server berjalan di port 3000'));\n` +
        `\`\`\`\n\n` +
        `*Anda dapat menguji endpoint ini secara langsung melalui aplikasi ini!*`
      );
    }

    if (lower.includes('fitur') || lower.includes('kemampuan') || lower.includes('apa yang bisa')) {
      return (
        `### Fitur Utama Chatbot Ini:\n\n` +
        `1. **Full-Stack Node.js & Express**: Arsitektur modular MVC (Controllers, Services, Routes, Config).\n` +
        `2. **Penyimpanan SQLite Persisten**: Riwayat percakapan otomatis tersimpan di SQLite lokal.\n` +
        `3. **Pencarian Riwayat**: Cari percakapan masa lalu dengan mudah di sidebar.\n` +
        `4. **Google Gemini AI Ready**: Integrasi langsung dengan model \`gemini-3.8-flash\` menggunakan SDK resmi \`@google/genai\`.\n` +
        `5. **Markdown & Code Highlight**: Mendukung format kode, daftar, kutipan, tabel, dan tombol salin.\n` +
        `6. **Dark & Light Mode**: Desain responsif profesional dengan tombol peralihan tema.\n`
      );
    }

    return (
      `Terima kasih atas pesan Anda: *" ${userPrompt} "*\n\n` +
      `Sistem telah memproses permintaan ini dan menyimpannya ke database SQLite lokal.\n\n` +
      `> ℹ️ **Mode Demonstrasi Aktif**\n` +
      `> Untuk mendapatkan jawaban mendalam berbasis kecerdasan buatan Google Gemini asli, pastikan variabel lingkungan \`GEMINI_API_KEY\` telah diatur.`
    );
  }
}

export const aiService = new AIService();
