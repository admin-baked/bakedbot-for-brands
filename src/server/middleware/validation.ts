/**
 * Input validation middleware using Zod schemas
 */

import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError, type ZodSchema } from 'zod';
import { logger } from '@/lib/monitoring';

// Re-export ZodSchema for use in other modules
export type { ZodSchema } from 'zod';

/**
 * Error response format for validation failures
 */
interface ValidationErrorResponse {
  error: string;
  code: string;
  details?: Array<{
    path: string[];
    message: string;
  }>;
}

/**
 * Validate request body against a Zod schema
 */
export async function validateRequestBody<T extends ZodSchema>(
  request: NextRequest,
  schema: T
): Promise<{ success: true; data: z.infer<T> } | { success: false; response: NextResponse }> {
  try {
    // Parse request body
    const body = await request.json();

    // Validate against schema
    const result = schema.safeParse(body);

    if (!result.success) {
      const errorResponse: ValidationErrorResponse = {
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: result.error.errors.map(err => ({
          path: err.path.map(String),
          message: err.message,
        })),
      };

      logger.warn('Request validation failed', {
        path: request.nextUrl.pathname,
        errors: errorResponse.details,
      });

      return {
        success: false,
        response: NextResponse.json(errorResponse, { status: 400 }),
      };
    }

    return { success: true, data: result.data };
  } catch (error) {
    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      logger.warn('Invalid JSON in request body', {
        path: request.nextUrl.pathname,
        error: error.message,
      });

      return {
        success: false,
        response: NextResponse.json(
          {
            error: 'Invalid JSON',
            code: 'INVALID_JSON',
          },
          { status: 400 }
        ),
      };
    }

    // Handle other errors
    logger.error('Unexpected error during validation', {
      path: request.nextUrl.pathname,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      success: false,
      response: NextResponse.json(
        {
          error: 'Internal server error',
          code: 'INTERNAL_ERROR',
        },
        { status: 500 }
      ),
    };
  }
}

/**
 * Validate query parameters against a Zod schema
 */
export function validateQueryParams<T extends ZodSchema>(
  request: NextRequest,
  schema: T
): { success: true; data: z.infer<T> } | { success: false; response: NextResponse } {
  try {
    // Get query parameters
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());

    // Validate against schema
    const result = schema.safeParse(params);

    if (!result.success) {
      const errorResponse: ValidationErrorResponse = {
        error: 'Invalid query parameters',
        code: 'VALIDATION_ERROR',
        details: result.error.errors.map(err => ({
          path: err.path.map(String),
          message: err.message,
        })),
      };

      logger.warn('Query parameter validation failed', {
        path: request.nextUrl.pathname,
        errors: errorResponse.details,
      });

      return {
        success: false,
        response: NextResponse.json(errorResponse, { status: 400 }),
      };
    }

    return { success: true, data: result.data };
  } catch (error) {
    logger.error('Unexpected error during query validation', {
      path: request.nextUrl.pathname,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      success: false,
      response: NextResponse.json(
        {
          error: 'Internal server error',
          code: 'INTERNAL_ERROR',
        },
        { status: 500 }
      ),
    };
  }
}

/**
 * Higher-order function to wrap route handlers with body validation
 *
 * @example
 * const schema = z.object({ email: z.string().email() });
 * export const POST = withValidation(schema, async (request, data) => {
 *   // data is typed as z.infer<typeof schema>
 *   return NextResponse.json({ success: true });
 * });
 */
export function withValidation<T extends ZodSchema>(
  schema: T,
  handler: (request: NextRequest, data: z.infer<T>) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const validation = await validateRequestBody(request, schema);

    if (!validation.success) {
      return validation.response;
    }

    return handler(request, validation.data);
  };
}

/**
 * Common validation schemas for reuse across routes
 */
export const commonSchemas = {
  /**
   * Pagination parameters
   */
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),

  /**
   * ID parameter (UUID)
   */
  id: z.object({
    id: z.string().uuid(),
  }),

  /**
   * Email parameter
   */
  email: z.object({
    email: z.string().email(),
  }),

  /**
   * Date range parameters
   */
  dateRange: z.object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  }),

  /**
   * Search query parameter
   */
  search: z.object({
    q: z.string().min(1).max(200),
  }),
};
