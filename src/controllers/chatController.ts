/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from 'express';
import { dbManager } from '../config/database.ts';
import { aiService } from '../services/aiService.ts';

export const handleSendMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { conversationId, message, systemPrompt } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({
        success: false,
        error: 'Pesan tidak boleh kosong.',
      });
      return;
    }

    const trimmedMessage = message.trim();
    if (trimmedMessage.length > 8000) {
      res.status(400).json({
        success: false,
        error: 'Pesan melebihi batas maksimum 8000 karakter.',
      });
      return;
    }

    let activeConversationId = conversationId;
    let isNewConversation = false;

    // Jika conversationId belum ada atau tidak ditemukan di database, buat percakapan baru
    if (!activeConversationId) {
      activeConversationId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      // Gunakan 35 karakter pertama dari pesan sebagai judul
      const title = trimmedMessage.slice(0, 35) + (trimmedMessage.length > 35 ? '...' : '');
      dbManager.createConversation(activeConversationId, title, systemPrompt || '');
      isNewConversation = true;
    } else {
      const existing = dbManager.getConversationById(activeConversationId);
      if (!existing.conversation) {
        // Buat baru jika ID tidak ada
        const title = trimmedMessage.slice(0, 35) + (trimmedMessage.length > 35 ? '...' : '');
        dbManager.createConversation(activeConversationId, title, systemPrompt || '');
        isNewConversation = true;
      }
    }

    // Ambil riwayat percakapan sebelumnya untuk konteks
    const { messages: existingMessages, conversation } = dbManager.getConversationById(activeConversationId);

    // Simpan pesan pengguna ke database
    const userMsgId = `msg_user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const savedUserMessage = dbManager.addMessage(
      userMsgId,
      activeConversationId,
      'user',
      trimmedMessage,
      'sent'
    );

    // Dapatkan jawaban dari AI Service
    const effectiveSystemPrompt = systemPrompt || conversation?.system_prompt;
    const aiResult = await aiService.generateReply(
      existingMessages,
      trimmedMessage,
      effectiveSystemPrompt
    );

    // Simpan pesan bot ke database
    const botMsgId = `msg_bot_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const savedBotMessage = dbManager.addMessage(
      botMsgId,
      activeConversationId,
      'bot',
      aiResult.text,
      aiResult.error ? 'error' : 'sent'
    );

    res.status(200).json({
      success: true,
      conversationId: activeConversationId,
      isNewConversation,
      userMessage: savedUserMessage,
      botMessage: savedBotMessage,
      model: aiResult.model,
      isDemoMode: aiResult.isDemoMode,
    });
  } catch (error) {
    next(error);
  }
};
