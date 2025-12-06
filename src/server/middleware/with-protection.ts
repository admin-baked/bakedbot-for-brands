/**
 * Composable middleware for API route protection
 * Combines authentication, CSRF, App Check, and input validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCsrf } from './csrf';
import { verifyAppCheck } from './app-check';
import { validateRequestBody, type ZodSchema } from './validation';
import { logger } from '@/lib/monitoring';
import { z } from 'zod';

export interface ProtectionOptions<T extends ZodSchema = any> {
  /**
   * Require CSRF token validation (default: true for POST/PUT/DELETE/PATCH)
   */
  csrf?: boolean;

  /**
   * Require App Check token validation (default: true in production)
   */
  appCheck?: boolean;

  /**
   * Require authentication (default: false, handle in route)
   */
  requireAuth?: boolean;

  /**
   * Zod schema for request body validation
   */
  schema?: T;
}

/**
 * Apply security protections to an API route handler
 *
 * @example
 * // Without validation
 * export const POST = withProtection(async (request) => {
 *   // Your route logic here
 * }, { csrf: true, appCheck: true });
 *
 * @example
 * // With validation
 * const schema = z.object({ email: z.string().email() });
 * export const POST = withProtection(async (request, data) => {
 *   // data is typed as { email: string }
 * }, { schema });
 */
export function withProtection<T extends ZodSchema = any>(
  handler: (request: NextRequest, data?: z.infer<T>) => Promise<NextResponse>,
  options: ProtectionOptions<T> = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const { csrf = true, appCheck = true, schema } = options;

    try {
      // Validate CSRF token for state-changing operations
      if (csrf) {
        const csrfResponse = await requireCsrf(request);
        if (csrfResponse) {
          return csrfResponse; // CSRF validation failed
        }
      }

      // Validate App Check token
      if (appCheck) {
        const isValidAppCheck = await verifyAppCheck(request);
        if (!isValidAppCheck) {
          logger.warn('App Check validation failed', {
            path: request.nextUrl.pathname,
            method: request.method,
          });

          return NextResponse.json(
            {
              error: 'Invalid or missing App Check token',
              code: 'APP_CHECK_FAILED',
            },
            { status: 403 }
          );
        }
      }

      // Validate request body if schema provided
      let validatedData: z.infer<T> | undefined;
      if (schema) {
        const validation = await validateRequestBody(request, schema);
        if (!validation.success) {
          return validation.response; // Validation failed
        }
        validatedData = validation.data;
      }

      // All validations passed, call the handler
      return await handler(request, validatedData);
    } catch (error) {
      logger.error('Error in withProtection middleware', {
        error: error instanceof Error ? error.message : String(error),
        path: request.nextUrl.pathname,
        method: request.method,
      });

      return NextResponse.json(
        {
          error: 'Internal server error',
          code: 'INTERNAL_ERROR',
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Quick preset: No protection (use for public endpoints)
 */
export function withNoProtection(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return withProtection(handler, { csrf: false, appCheck: false });
}

/**
 * Quick preset: CSRF only (use for authenticated routes that don't need App Check)
 */
export function withCsrfOnly(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return withProtection(handler, { csrf: true, appCheck: false });
}

/**
 * Quick preset: Full protection (use for sensitive operations)
 */
export function withFullProtection(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return withProtection(handler, { csrf: true, appCheck: true });
}
