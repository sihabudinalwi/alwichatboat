/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from 'express';
import { dbManager } from '../config/database.ts';
import { aiService } from '../services/aiService.ts';

export const getConversations = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const search = req.query.search as string | undefined;
    const conversations = dbManager.getConversations(search);
    res.json({
      success: true,
      data: conversations,
    });
  } catch (error) {
    next(error);
  }
};

export const getConversationById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const result = dbManager.getConversationById(id);

    if (!result.conversation) {
      res.status(404).json({
        success: false,
        error: 'Percakapan tidak ditemukan.',
      });
      return;
    }

    res.json({
      success: true,
      conversation: result.conversation,
      messages: result.messages,
    });
  } catch (error) {
    next(error);
  }
};

export const createConversation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { title, systemPrompt } = req.body;
    const id = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newConv = dbManager.createConversation(
      id,
      title?.trim() || 'Percakapan Baru',
      systemPrompt?.trim() || ''
    );

    res.status(201).json({
      success: true,
      data: newConv,
    });
  } catch (error) {
    next(error);
  }
};

export const updateConversation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { title } = req.body;

    if (!title || !title.trim()) {
      res.status(400).json({
        success: false,
        error: 'Judul tidak boleh kosong.',
      });
      return;
    }

    dbManager.updateConversationTitle(id, title.trim());
    res.json({
      success: true,
      message: 'Judul percakapan berhasil diperbarui.',
    });
  } catch (error) {
    next(error);
  }
};

export const deleteConversation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const deleted = dbManager.deleteConversation(id);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: 'Percakapan tidak ditemukan atau sudah dihapus.',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Percakapan berhasil dihapus.',
    });
  } catch (error) {
    next(error);
  }
};

export const clearAllConversations = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    dbManager.clearAll();
    res.json({
      success: true,
      message: 'Semua riwayat percakapan berhasil dihapus.',
    });
  } catch (error) {
    next(error);
  }
};

export const getSystemStatus = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const isGeminiConfigured = aiService.isConfigured();
    const model = aiService.getModelName();
    const stats = dbManager.getStats();

    res.json({
      success: true,
      isGeminiConfigured,
      model,
      database: 'SQLite (native node:sqlite)',
      stats,
    });
  } catch (error) {
    next(error);
  }
};
