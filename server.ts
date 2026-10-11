/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createApp } from './src/app.ts';

// Muat variabel lingkungan dari .env
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const app = createApp();

  if (!isProduction) {
    // Mode pengembangan: integrasikan Vite dev server middleware
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Mode produksi: sajikan file statis hasil build dist
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Chatbot Node.js Server berjalan di http://0.0.0.0:${PORT}`);
    console.log(`📦 Database: SQLite (data/chatbot.db)`);
    console.log(`🤖 AI Engine: ${process.env.GEMINI_API_KEY ? 'Google Gemini API' : 'Mode Demo (API Key belum diisi)'}`);
  });
}

startServer().catch((err) => {
  console.error('❌ Gagal menjalankan server:', err);
  process.exit(1);
});
