import { AppConfigService } from './app-config.service';
import { ConfigService } from '@nestjs/config';

describe('AppConfigService', () => {
  let configService: ConfigService;
  let appConfig: AppConfigService;

  const mockEnv: Record<string, string> = {
    NODE_ENV: 'development',
    PORT: '3000',
    API_BASE_URL: 'http://localhost:3000',
    DATABASE_HOST: 'localhost',
    DATABASE_PORT: '5432',
    DATABASE_NAME: 'chatbot_platform',
    DATABASE_USER: 'postgres',
    DATABASE_PASSWORD: 'postgres',
    DATABASE_SSL: 'false',
    DATABASE_LOGGING: 'true',
    REDIS_ENABLED: 'false',
    CORS_ORIGINS: 'http://localhost:5173,http://localhost:5174',
    ADMIN_API_KEY: 'a'.repeat(32),
  };

  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
    delete process.env.NODE_ENV;
    configService = new ConfigService(mockEnv);
    appConfig = new AppConfigService(configService);
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('application settings', () => {
    it('should return the correct nodeEnv', () => {
      expect(appConfig.nodeEnv).toBe('development');
    });

    it('should correctly identify development mode', () => {
      expect(appConfig.isDevelopment).toBe(true);
      expect(appConfig.isProduction).toBe(false);
    });

    it('should return the correct port', () => {
      expect(appConfig.port).toBe(3000);
    });

    it('should return the API base URL', () => {
      expect(appConfig.apiBaseUrl).toBe('http://localhost:3000');
    });
  });

  describe('database settings', () => {
    it('should return database connection properties', () => {
      expect(appConfig.databaseHost).toBe('localhost');
      expect(appConfig.databasePort).toBe(5432);
      expect(appConfig.databaseName).toBe('chatbot_platform');
      expect(appConfig.databaseUser).toBe('postgres');
      expect(appConfig.databasePassword).toBe('postgres');
    });

    it('should parse database SSL flag', () => {
      expect(appConfig.databaseSsl).toBe(false);
    });

    it('should parse database logging flag', () => {
      expect(appConfig.databaseLogging).toBe(true);
    });
  });

  describe('redis settings', () => {
    it('should report redis as disabled by default', () => {
      expect(appConfig.redisEnabled).toBe(false);
    });

    it('should not require redis host/port when disabled', () => {
      expect(appConfig.redisHost).toBe('');
      expect(appConfig.redisPort).toBe(6379);
    });

    it('should require redis host/port when enabled', () => {
      const enabledEnv = { ...mockEnv, REDIS_ENABLED: 'true', REDIS_HOST: 'redis.local', REDIS_PORT: '6380' };
      const enabledConfig = new AppConfigService(new ConfigService(enabledEnv));

      expect(enabledConfig.redisEnabled).toBe(true);
      expect(enabledConfig.redisHost).toBe('redis.local');
      expect(enabledConfig.redisPort).toBe(6380);
    });

    it('should throw when redis is enabled but host is missing', () => {
      const badEnv = { ...mockEnv, REDIS_ENABLED: 'true' };
      const badConfig = new AppConfigService(new ConfigService(badEnv));

      expect(() => badConfig.redisHost).toThrow('Missing required environment variable: REDIS_HOST');
    });
  });

  describe('CORS settings', () => {
    it('should parse CORS origins into an array', () => {
      expect(appConfig.corsOrigins).toEqual([
        'http://localhost:5173',
        'http://localhost:5174',
      ]);
    });
  });

  describe('missing required variables', () => {
    it('should throw when a required variable is missing', () => {
      const emptyConfig = new ConfigService({});
      expect(() => new AppConfigService(emptyConfig)).toThrow(
        'ADMIN_API_KEY must be defined and at least 32 characters long for security',
      );
    });
  });
});
