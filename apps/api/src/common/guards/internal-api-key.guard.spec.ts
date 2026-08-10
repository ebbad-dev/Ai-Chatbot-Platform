import { InternalApiKeyGuard } from './internal-api-key.guard';
import { AppConfigService } from '../../config/app-config.service';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { describe, it, expect, beforeEach } from 'vitest';

describe('InternalApiKeyGuard', () => {
  let guard: InternalApiKeyGuard;
  let mockConfigService: Partial<AppConfigService>;

  beforeEach(() => {
    mockConfigService = {
      adminApiKey: 'secret-key-123',
    };
    guard = new InternalApiKeyGuard(mockConfigService as AppConfigService);
  });

  it('should throw UnauthorizedException if header is missing', () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {},
        }),
      }),
    } as ExecutionContext;

    expect(() => guard.canActivate(mockContext)).toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if header is incorrect', () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { 'x-admin-api-key': 'wrong-key' },
        }),
      }),
    } as ExecutionContext;

    expect(() => guard.canActivate(mockContext)).toThrow(UnauthorizedException);
  });

  it('should return true if header is correct', () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { 'x-admin-api-key': 'secret-key-123' },
        }),
      }),
    } as ExecutionContext;

    expect(guard.canActivate(mockContext)).toBe(true);
  });
});
