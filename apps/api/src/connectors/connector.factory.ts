import { Injectable, Logger } from '@nestjs/common';
import { IConnector } from './connector.interface';
import { ConnectorConfig } from './types/connector.types';
import { OpenCartConnector } from './opencart/opencart.connector';
import { SafeFetchService } from '../crawler/services/safe-fetch.service';
import { PlatformType } from '@chatbot-platform/shared-types';

@Injectable()
export class ConnectorFactory {
  private readonly logger = new Logger(ConnectorFactory.name);

  constructor(private readonly safeFetch: SafeFetchService) {}

  /**
   * Instantiates and returns the appropriate platform connector based on the chatbot configuration.
   */
  create(
    platformType: PlatformType | string,
    config?: ConnectorConfig | Record<string, unknown> | null,
  ): IConnector {
    const cleanConfig = (config || {}) as ConnectorConfig;

    switch (platformType) {
      case PlatformType.OPENCART:
      case 'opencart':
      case 'printez':
      case PlatformType.GENERIC:
      case 'generic':
        return new OpenCartConnector(cleanConfig, this.safeFetch);

      // Future platforms will be added here:
      // case PlatformType.SHOPIFY: return new ShopifyConnector(cleanConfig, this.safeFetch);
      // case PlatformType.WOOCOMMERCE: return new WooCommerceConnector(cleanConfig, this.safeFetch);

      default:
        this.logger.warn(`Unsupported platform type '${platformType}', falling back to OpenCart/Generic connector`);
        return new OpenCartConnector(cleanConfig, this.safeFetch);
    }
  }
}
