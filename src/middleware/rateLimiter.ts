/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [ip: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};
const WINDOW_MS = 60 * 1000; // 1 menit
const MAX_REQUESTS = 60; // Max 60 request per menit per IP

export const rateLimiter = (req: Request, res: Response, next: NextFunction): void => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();

  if (!store[ip] || now > store[ip].resetTime) {
    store[ip] = {
      count: 1,
      resetTime: now + WINDOW_MS,
    };
    next();
    return;
  }

  store[ip].count += 1;

  if (store[ip].count > MAX_REQUESTS) {
    res.status(429).json({
      success: false,
      error: 'Terlalu banyak permintaan (Rate limit exceeded). Silakan tunggu 1 menit.',
    });
    return;
  }

  next();
};
