/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

export interface DBConversation {
  id: string;
  title: string;
  created_at: number;
  updated_at: number;
  system_prompt?: string;
  message_count?: number;
  last_message?: string;
}

export interface DBMessage {
  id: string;
  conversation_id: string;
  sender: 'user' | 'bot' | 'system';
  text: string;
  created_at: number;
  status: 'sent' | 'error';
  tokens_used?: number;
}

class DatabaseManager {
  private db: DatabaseSync;

  constructor() {
    const dataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const dbPath = path.join(dataDir, 'chatbot.db');
    this.db = new DatabaseSync(dbPath);
    this.initTables();
  }

  private initTables(): void {
    // Enable WAL mode for better concurrency and performance
    try {
      this.db.exec('PRAGMA journal_mode = WAL;');
      this.db.exec('PRAGMA foreign_keys = ON;');
    } catch {
      // Ignore if pragma unsupported in memory
    }

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        system_prompt TEXT DEFAULT ''
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        sender TEXT NOT NULL,
        text TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        status TEXT DEFAULT 'sent',
        tokens_used INTEGER DEFAULT 0,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);
    `);
  }

  public getConversations(search?: string): DBConversation[] {
    if (search && search.trim()) {
      const stmt = this.db.prepare(`
        SELECT 
          c.id, 
          c.title, 
          c.created_at, 
          c.updated_at, 
          c.system_prompt,
          COUNT(m.id) as message_count,
          (
            SELECT text FROM messages 
            WHERE conversation_id = c.id 
            ORDER BY created_at DESC LIMIT 1
          ) as last_message
        FROM conversations c
        LEFT JOIN messages m ON c.id = m.conversation_id
        WHERE c.title LIKE ? OR c.id IN (
          SELECT conversation_id FROM messages WHERE text LIKE ?
        )
        GROUP BY c.id
        ORDER BY c.updated_at DESC
      `);
      const term = `%${search.trim()}%`;
      return stmt.all(term, term) as unknown as DBConversation[];
    }

    const stmt = this.db.prepare(`
      SELECT 
        c.id, 
        c.title, 
        c.created_at, 
        c.updated_at, 
        c.system_prompt,
        COUNT(m.id) as message_count,
        (
          SELECT text FROM messages 
          WHERE conversation_id = c.id 
          ORDER BY created_at DESC LIMIT 1
        ) as last_message
      FROM conversations c
      LEFT JOIN messages m ON c.id = m.conversation_id
      GROUP BY c.id
      ORDER BY c.updated_at DESC
    `);
    return stmt.all() as unknown as DBConversation[];
  }

  public getConversationById(id: string): { conversation: DBConversation | null; messages: DBMessage[] } {
    const convStmt = this.db.prepare(`
      SELECT id, title, created_at, updated_at, system_prompt
      FROM conversations
      WHERE id = ?
    `);
    const conversation = convStmt.get(id) as unknown as DBConversation | undefined;

    if (!conversation) {
      return { conversation: null, messages: [] };
    }

    const msgStmt = this.db.prepare(`
      SELECT id, conversation_id, sender, text, created_at, status, tokens_used
      FROM messages
      WHERE conversation_id = ?
      ORDER BY created_at ASC
    `);
    const messages = msgStmt.all(id) as unknown as DBMessage[];

    return { conversation, messages };
  }

  public createConversation(id: string, title: string, systemPrompt = ''): DBConversation {
    const now = Date.now();
    const stmt = this.db.prepare(`
      INSERT INTO conversations (id, title, created_at, updated_at, system_prompt)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(id, title, now, now, systemPrompt);
    return {
      id,
      title,
      created_at: now,
      updated_at: now,
      system_prompt: systemPrompt,
      message_count: 0
    };
  }

  public updateConversationTitle(id: string, title: string): void {
    const stmt = this.db.prepare(`
      UPDATE conversations
      SET title = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(title, Date.now(), id);
  }

  public touchConversation(id: string): void {
    const stmt = this.db.prepare(`
      UPDATE conversations
      SET updated_at = ?
      WHERE id = ?
    `);
    stmt.run(Date.now(), id);
  }

  public addMessage(
    id: string,
    conversationId: string,
    sender: 'user' | 'bot' | 'system',
    text: string,
    status: 'sent' | 'error' = 'sent'
  ): DBMessage {
    const now = Date.now();
    const stmt = this.db.prepare(`
      INSERT INTO messages (id, conversation_id, sender, text, created_at, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, conversationId, sender, text, now, status);
    this.touchConversation(conversationId);

    return {
      id,
      conversation_id: conversationId,
      sender,
      text,
      created_at: now,
      status
    };
  }

  public deleteConversation(id: string): boolean {
    const stmt = this.db.prepare(`DELETE FROM conversations WHERE id = ?`);
    const result = stmt.run(id);
    // Also delete any dangling messages if cascade not caught
    this.db.prepare(`DELETE FROM messages WHERE conversation_id = ?`).run(id);
    return (result.changes ?? 0) > 0;
  }

  public clearAll(): void {
    this.db.exec(`DELETE FROM messages; DELETE FROM conversations;`);
  }

  public getStats(): { conversationsCount: number; messagesCount: number } {
    const cStmt = this.db.prepare(`SELECT COUNT(*) as count FROM conversations`);
    const mStmt = this.db.prepare(`SELECT COUNT(*) as count FROM messages`);
    const cRes = cStmt.get() as { count: number };
    const mRes = mStmt.get() as { count: number };
    return {
      conversationsCount: cRes?.count ?? 0,
      messagesCount: mRes?.count ?? 0
    };
  }
}

export const dbManager = new DatabaseManager();
