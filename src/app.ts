/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import chatRoutes from './routes/chatRoutes.ts';
import conversationRoutes from './routes/conversationRoutes.ts';
import { getSystemStatus } from './controllers/conversationController.ts';
import { errorHandler } from './middleware/errorHandler.ts';

export const createApp = (): Express => {
  const app = express();

  // Middleware keamanan & parsing payload
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Security Headers Middleware
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // API Status & Health Check
  app.get('/api/status', getSystemStatus);
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Routes API
  app.use('/api/chat', chatRoutes);
  app.use('/api/conversations', conversationRoutes);

  // Penanganan error terpusat
  app.use(errorHandler);

  return app;
};
