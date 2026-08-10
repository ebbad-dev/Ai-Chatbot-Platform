import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service';
import * as crypto from 'crypto';

@Injectable()
export class InternalApiKeyGuard implements CanActivate {
  constructor(private configService: AppConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKeyHeader = request.headers['x-admin-api-key'];

    if (!apiKeyHeader) {
      throw new UnauthorizedException('Missing X-Admin-Api-Key header');
    }

    const validKey = this.configService.adminApiKey;

    // Use constant-time comparison to prevent timing attacks
    if (
      apiKeyHeader.length !== validKey.length ||
      !crypto.timingSafeEqual(Buffer.from(apiKeyHeader), Buffer.from(validKey))
    ) {
      throw new UnauthorizedException('Invalid X-Admin-Api-Key header');
    }

    return true;
  }
}
