import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Correlation ID interceptor.
 *
 * Generates a unique UUID for every request and:
 * - Attaches it to the request object for downstream use
 * - Sets it as the X-Correlation-ID response header
 * - Logs the request method, URL, status, and duration
 *
 * Logging is safe: no message bodies, secrets, or PII are logged.
 */
@Injectable()
export class CorrelationInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Use existing correlation ID if provided, otherwise generate one
    const correlationId =
      (request.headers['x-correlation-id'] as string) || uuidv4();

    // Attach to request for use in services and exception filters
    request.headers['x-correlation-id'] = correlationId;

    // Set response header
    response.setHeader('X-Correlation-ID', correlationId);

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          this.logger.log(
            `${request.method} ${request.url} → ${response.statusCode} [${duration}ms]`,
            { correlationId },
          );
        },
        error: () => {
          // Error logging is handled by the exception filter
          // This tap just ensures we don't miss the timing
        },
      }),
    );
  }
}
