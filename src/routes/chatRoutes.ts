/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { handleSendMessage } from '../controllers/chatController.ts';
import { rateLimiter } from '../middleware/rateLimiter.ts';

const router = Router();

// Endpoint utama untuk mengirim pesan chatbot
router.post('/', rateLimiter, handleSendMessage);

export default router;
