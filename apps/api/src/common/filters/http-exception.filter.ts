import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Global HTTP exception filter.
 *
 * Ensures every error response follows the standard format:
 *   { statusCode, code, message, correlationId, details? }
 *
 * - HttpExceptions: uses the exception's status and response
 * - Unknown exceptions: returns 500 with a safe message (no stack trace in response)
 * - Logs the full error internally for debugging
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const correlationId =
      (request.headers['x-correlation-id'] as string) || 'unknown';

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred.';
    let details: Array<{ field?: string; message: string }> | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        code = this.statusToCode(statusCode);
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as Record<string, unknown>;
        message = (responseObj.message as string) || message;
        code = (responseObj.code as string) || this.statusToCode(statusCode);

        // Handle class-validator error arrays
        if (Array.isArray(responseObj.message)) {
          details = (responseObj.message as string[]).map((msg) => ({
            message: msg,
          }));
          message = 'Validation failed';
          code = 'VALIDATION_ERROR';
        }
      }
    } else {
      // Unknown error — log full details but never expose stack to client
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
        { correlationId },
      );
    }

    // Structured safe log for all errors
    this.logger.warn(
      `${request.method} ${request.url} → ${statusCode} [${code}]`,
      { correlationId, statusCode, code },
    );

    response.status(statusCode).json({
      statusCode,
      code: code || this.statusToCode(statusCode),
      message,
      correlationId,
      ...(details ? { details } : {}),
    });
  }

  private statusToCode(status: number): string {
    const map: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'VALIDATION_ERROR',
      429: 'RATE_LIMITED',
      500: 'INTERNAL_ERROR',
      502: 'PROVIDER_ERROR',
      503: 'SERVICE_UNAVAILABLE',
    };
    return map[status] || 'UNKNOWN_ERROR';
  }
}
