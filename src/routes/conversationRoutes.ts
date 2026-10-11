/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import {
  getConversations,
  getConversationById,
  createConversation,
  updateConversation,
  deleteConversation,
  clearAllConversations,
} from '../controllers/conversationController.ts';

const router = Router();

// Mengambil daftar percakapan (mendukung query ?search=...)
router.get('/', getConversations);

// Membuat percakapan baru
router.post('/', createConversation);

// Menghapus semua percakapan
router.delete('/', clearAllConversations);

// Mengambil detail percakapan beserta seluruh pesan di dalamnya
router.get('/:id', getConversationById);

// Memperbarui judul percakapan
router.patch('/:id', updateConversation);

// Menghapus percakapan berdasarkan ID
router.delete('/:id', deleteConversation);

export default router;
