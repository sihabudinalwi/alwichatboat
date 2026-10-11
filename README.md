# Node.js AI Chatbot (Express + SQLite + Google Gemini)

Website Chatbot interaktif full-stack modern yang dibangun menggunakan **Node.js**, **Express.js**, **SQLite**, dan model AI **Google Gemini (`gemini-3.8-flash`)**.

---

## 1. Arsitektur Aplikasi

Aplikasi dirancang dengan pendekatan modular Clean Architecture / MVC:

* **Config Layer (`src/config/database.ts`)**: Mengelola koneksi dan skema database SQLite (menggunakan modul bawaan `node:sqlite` berkecepatan tinggi) dengan mode WAL dan Foreign Keys.
* **Service Layer (`src/services/aiService.ts`)**: Lapisan integrasi AI model menggunakan SDK resmi `@google/genai`. Mengelola konteks multi-turn conversation, system persona prompts, dan mode simulasi otomatis saat API Key belum tersedia.
* **Controller Layer (`src/controllers/`)**: Memisahkan logika bisnis validasi, pemrosesan pesan, manajemen riwayat percakapan, dan status sistem.
* **Routes Layer (`src/routes/`)**: Definisi endpoint RESTful API terstruktur (`/api/chat`, `/api/conversations`).
* **Middleware Layer (`src/middleware/`)**: Rate limiter untuk perlindungan DDoS, security headers, dan penanganan error terpusat.
* **Frontend**: Antarmuka responsif modern dengan dukungan Dark & Light theme, rendering Markdown, format kode dengan tombol salin (copy-to-clipboard), pencarian riwayat percakapan, dan indikator status real-time.

---

## 2. Struktur Folder Proyek

```text
chatbot-nodejs/
├── data/                       # Direktori penyimpanan database SQLite (chatbot.db)
├── public/                     # Frontend statis vanilla (HTML5, CSS3, JavaScript)
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── app.js
├── src/
│   ├── config/
│   │   └── database.ts         # Konfigurasi & ORM/Query SQLite
│   ├── controllers/
│   │   ├── chatController.ts   # Handler pemrosesan pesan chat
│   │   └── conversationController.ts # Handler CRUD riwayat percakapan
│   ├── routes/
│   │   ├── chatRoutes.ts       # Endpoint POST /api/chat
│   │   └── conversationRoutes.ts # Endpoint /api/conversations
│   ├── services/
│   │   └── aiService.ts        # Integrasi Google Gemini API (@google/genai)
│   ├── middleware/
│   │   ├── errorHandler.ts     # Penanganan error terpusat
│   │   └── rateLimiter.ts      # Pembatas laju request (Rate Limiting)
│   ├── app.ts                  # Konfigurasi Express app
│   ├── App.tsx                 # Frontend UI responsif React + Tailwind
│   └── main.tsx                # Client entry point
├── .env.example                # Template variabel lingkungan
├── .gitignore                  # Pengecualian git untuk keamanan (.env, data/)
├── metadata.json               # Metadata aplikasi
├── package.json                # Daftar dependensi & scripts
├── server.ts                   # Entry point server Express Node.js
└── tsconfig.json               # Konfigurasi TypeScript
```

---

## 3. Prasyarat & Instalasi

### Prasyarat
* **Node.js**: Versi 22.0.0 atau lebih tinggi (mendukung `node:sqlite` bawaan).
* **NPM**: Versi 9.0.0 atau lebih tinggi.

### Langkah Instalasi
1. Clone repositori atau unduh folder proyek:
   ```bash
   git clone <repo-url>
   cd chatbot-nodejs
   ```

2. Pasang semua dependensi:
   ```bash
   npm install
   ```

3. Siapkan file konfigurasi lingkungan:
   ```bash
   cp .env.example .env
   ```

---

## 4. Konfigurasi API Key Model AI

Buka file `.env` dan masukkan API Key Google Gemini Anda:

```env
PORT=3000
NODE_ENV=development
GEMINI_API_KEY="AIzaSyYourGeminiApiKeyHere"
```

> **Catatan**: 
> * Jika `GEMINI_API_KEY` belum diisi, aplikasi akan otomatis beralih ke **Mode Demonstrasi Terbimbing** tanpa menyebabkan crash pada server.
> * Anda dapat memperoleh API Key gratis melalui [Google AI Studio](https://aistudio.google.com/).

---

## 5. Menjalankan Aplikasi

### Mode Pengembangan (Development)
Menjalankan server Express dan Vite dengan hot reload:
```bash
npm run dev
```
Akses di browser pada: `http://localhost:3000`

### Mode Produksi (Production)
Membangun frontend dan menjalankan server Express:
```bash
npm run build
npm start
```

---

## 6. Dokumentasi RESTful API & Panduan Pengujian

### 1. Mengirim Pesan Chat
* **Method**: `POST`
* **URL**: `/api/chat`
* **Headers**: `Content-Type: application/json`
* **Body**:
  ```json
  {
    "conversationId": "conv_opsional",
    "message": "Halo, jelaskan apa itu Node.js!",
    "systemPrompt": "Anda adalah asisten programming."
  }
  ```
* **Contoh cURL**:
  ```bash
  curl -X POST http://localhost:3000/api/chat \
    -H "Content-Type: application/json" \
    -d '{"message": "Halo! Jelaskan konsep REST API."}'
  ```

### 2. Mengambil Daftar Percakapan
* **Method**: `GET`
* **URL**: `/api/conversations` (atau dengan pencarian: `/api/conversations?search=node`)
* **Contoh cURL**:
  ```bash
  curl http://localhost:3000/api/conversations
  ```

### 3. Mengambil Detail & Riwayat Pesan Percakapan
* **Method**: `GET`
* **URL**: `/api/conversations/:id`
* **Contoh cURL**:
  ```bash
  curl http://localhost:3000/api/conversations/conv_123456
  ```

### 4. Menghapus Percakapan Tertentu
* **Method**: `DELETE`
* **URL**: `/api/conversations/:id`

### 5. Cek Status Sistem (Health Check & API Key Status)
* **Method**: `GET`
* **URL**: `/api/status`

---

## 7. Panduan Mengatasi Error Umum (Troubleshooting)

1. **`Cannot find module 'node:sqlite'`**:
   * **Penyebab**: Versi Node.js di bawah v22.
   * **Solusi**: Perbarui Node.js ke versi 22+ (`nvm use 22`).
2. **`429 Rate Limit Exceeded`**:
   * **Penyebab**: Terlalu banyak request berturut-turut dalam 1 menit.
   * **Solusi**: Tunggu 60 detik sebelum mengirim pesan berikutnya.
3. **`Gemini API Error / Quota Exceeded`**:
   * **Penyebab**: API key tidak valid atau batas kuota token tercapai.
   * **Solusi**: Periksa validitas API key di Google AI Studio. Sistem akan menampilkan error yang informatif di antarmuka obrolan.

---

## 8. Panduan Deployment

### Deploy ke Cloud Run / VPS / Docker
Aplikasi siap dideploy menggunakan Node.js runtime:
```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

Variabel lingkungan yang wajib disediakan di platform hosting:
* `NODE_ENV=production`
* `PORT=3000`
* `GEMINI_API_KEY=<kunci-api-anda>`
