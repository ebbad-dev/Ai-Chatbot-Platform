import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { AppConfigService } from './app-config.service';

/**
 * Global configuration module.
 *
 * Loads and validates environment variables at startup.
 * AppConfigService is exported globally so all modules can inject it
 * without re-importing this module.
 */
@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      // Validation is handled by AppConfigService accessors
      // which throw on missing required variables at first access.
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
