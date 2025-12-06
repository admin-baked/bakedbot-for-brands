/**
 * Standardized error handling for API routes
 */

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { logger } from '@/lib/monitoring';

/**
 * Standard error codes used across the application
 */
export enum ErrorCode {
  // Client Errors (4xx)
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // Server Errors (5xx)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  GATEWAY_TIMEOUT = 'GATEWAY_TIMEOUT',

  // Security Errors
  CSRF_VALIDATION_FAILED = 'CSRF_VALIDATION_FAILED',
  APP_CHECK_FAILED = 'APP_CHECK_FAILED',
  INVALID_TOKEN = 'INVALID_TOKEN',

  // Business Logic Errors
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  RESOURCE_LOCKED = 'RESOURCE_LOCKED',
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',
}

/**
 * Base application error class
 */
export class AppError extends Error {
  code: ErrorCode;
  statusCode: number;
  details?: unknown;

  constructor(message: string, code: ErrorCode, statusCode: number, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * HTTP status codes mapped to error codes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

/**
 * Convert error to standardized API response
 */
export function toErrorResponse(error: unknown, defaultMessage = 'An error occurred'): NextResponse {
  // Handle AppError
  if (error instanceof AppError) {
    logger.error(error.message, {
      code: error.code,
      statusCode: error.statusCode,
      details: error.details,
    });

    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        ...(error.details ? { details: error.details } : {}),
      },
      { status: error.statusCode }
    );
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    logger.warn('Validation error', {
      errors: error.errors,
    });

    return NextResponse.json(
      {
        error: 'Validation failed',
        code: ErrorCode.VALIDATION_ERROR,
        details: error.errors.map(err => ({
          path: err.path.map(String),
          message: err.message,
        })),
      },
      { status: HTTP_STATUS.BAD_REQUEST }
    );
  }

  // Handle Firebase errors
  if (error && typeof error === 'object' && 'code' in error) {
    const firebaseError = error as { code: string; message: string };

    // Map common Firebase errors to HTTP statuses
    const statusMap: Record<string, number> = {
      'permission-denied': HTTP_STATUS.FORBIDDEN,
      'unauthenticated': HTTP_STATUS.UNAUTHORIZED,
      'not-found': HTTP_STATUS.NOT_FOUND,
      'already-exists': HTTP_STATUS.CONFLICT,
      'resource-exhausted': HTTP_STATUS.TOO_MANY_REQUESTS,
    };

    const status = statusMap[firebaseError.code] || HTTP_STATUS.INTERNAL_SERVER_ERROR;

    logger.error('Firebase error', {
      code: firebaseError.code,
      message: firebaseError.message,
    });

    return NextResponse.json(
      {
        error: firebaseError.message || defaultMessage,
        code: firebaseError.code.toUpperCase().replace(/-/g, '_'),
      },
      { status }
    );
  }

  // Handle standard Error
  if (error instanceof Error) {
    logger.error('Unexpected error', {
      message: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      {
        error: error.message || defaultMessage,
        code: ErrorCode.INTERNAL_ERROR,
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }

  // Handle unknown errors
  logger.error('Unknown error type', {
    error: String(error),
  });

  return NextResponse.json(
    {
      error: defaultMessage,
      code: ErrorCode.INTERNAL_ERROR,
    },
    { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
  );
}

/**
 * Common error factory functions
 */
export const errors = {
  badRequest: (message: string, details?: unknown) =>
    new AppError(message, ErrorCode.BAD_REQUEST, HTTP_STATUS.BAD_REQUEST, details),

  unauthorized: (message = 'Unauthorized') =>
    new AppError(message, ErrorCode.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED),

  forbidden: (message = 'Forbidden') =>
    new AppError(message, ErrorCode.FORBIDDEN, HTTP_STATUS.FORBIDDEN),

  notFound: (resource: string) =>
    new AppError(`${resource} not found`, ErrorCode.NOT_FOUND, HTTP_STATUS.NOT_FOUND),

  conflict: (message: string) =>
    new AppError(message, ErrorCode.CONFLICT, HTTP_STATUS.CONFLICT),

  validation: (message: string, details?: unknown) =>
    new AppError(message, ErrorCode.VALIDATION_ERROR, HTTP_STATUS.BAD_REQUEST, details),

  rateLimitExceeded: (message = 'Rate limit exceeded') =>
    new AppError(message, ErrorCode.RATE_LIMIT_EXCEEDED, HTTP_STATUS.TOO_MANY_REQUESTS),

  internal: (message = 'Internal server error') =>
    new AppError(message, ErrorCode.INTERNAL_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR),

  serviceUnavailable: (message = 'Service temporarily unavailable') =>
    new AppError(message, ErrorCode.SERVICE_UNAVAILABLE, HTTP_STATUS.SERVICE_UNAVAILABLE),
};
