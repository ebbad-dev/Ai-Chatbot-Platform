import { NestFactory } from '@nestjs/core';
// Trigger restart
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { AppConfigService } from './config';
import { HttpExceptionFilter, CorrelationInterceptor } from './common';

/**
 * Application bootstrap.
 *
 * Sets up:
 * - Global validation pipe with DTO allowlisting
 * - Global exception filter for consistent error responses
 * - Correlation ID interceptor for request tracing
 * - CORS with configurable origins
 * - Global API prefix: /api/v1
 */
import helmet from 'helmet';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Basic OWASP headers
  app.use(helmet());

  const config = app.get(AppConfigService);

  // Global API prefix
  app.setGlobalPrefix('api/v1');

  // Global validation — allowlist DTO properties, reject unknown fields
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
    }),
  );

  // Global exception filter — consistent error response format
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global correlation ID interceptor — request tracing
  app.useGlobalInterceptors(new CorrelationInterceptor());

  // CORS — configurable origins
  app.enableCors({
    origin: config.corsOrigins,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Session-Token',
      'X-Correlation-ID',
      'X-Idempotency-Key',
    ],
    exposedHeaders: [
      'X-Correlation-ID',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
    ],
    credentials: true,
  });

  const port = config.port;
  await app.listen(port);

  logger.log(`API server running on http://localhost:${port}`);
  logger.log(`Health check: http://localhost:${port}/api/v1/health`);
  logger.log(`Environment: ${config.nodeEnv}`);
}

bootstrap();
