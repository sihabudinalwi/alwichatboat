/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  console.error('[SERVER ERROR]:', err);

  const status = (err as unknown as { status?: number }).status || 500;
  res.status(status).json({
    success: false,
    error: err.message || 'Terjadi kesalahan internal pada server.',
  });
};
