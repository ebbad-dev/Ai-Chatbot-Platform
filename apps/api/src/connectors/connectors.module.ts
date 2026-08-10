import { Module } from '@nestjs/common';
import { CrawlerModule } from '../crawler/crawler.module';
import { ConnectorFactory } from './connector.factory';

/**
 * Connectors module.
 * Provides abstract multi-platform e-commerce connectivity (OpenCart, PrintEZ, etc.)
 * by exporting ConnectorFactory to dependent modules (ProductSync, Retrieval).
 */
@Module({
  imports: [CrawlerModule],
  providers: [ConnectorFactory],
  exports: [ConnectorFactory],
})
export class ConnectorsModule {}
