/**
 * Configuration schema for e-commerce connectors.
 * Stored in Chatbot.connectorConfig as JSONB.
 */
export interface ConnectorConfig {
  /** Base origin/URL of the e-commerce API (e.g. https://www.printez.com) */
  apiBaseUrl?: string;

  /** API Key or bearer token for authentication if required */
  apiKey?: string;

  /** API Secret or password for authentication if required */
  apiSecret?: string;

  /** Custom endpoint paths if they deviate from default platform paths */
  endpoints?: {
    products?: string;
    categories?: string;
    orders?: string;
  };

  /** Mapping of platform custom fields to universal attributes */
  customFields?: Record<string, string>;

  /** Additional flexible settings for specific platforms */
  [key: string]: string | number | boolean | object | undefined | null;
}
