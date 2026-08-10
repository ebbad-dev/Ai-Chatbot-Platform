import { Module, forwardRef } from '@nestjs/common';
import { ConnectorsModule } from '../connectors/connectors.module';
import { ChatbotsModule } from '../chatbots/chatbots.module';
import { OrderProxyService } from './services/order-proxy.service';
import { OrdersController } from './orders.controller';

import { PublicOrdersController } from './public-orders.controller';

/**
 * Orders Module managing secure, stateless, real-time e-commerce order checkups.
 */
@Module({
  imports: [ConnectorsModule, forwardRef(() => ChatbotsModule)],
  controllers: [OrdersController, PublicOrdersController],
  providers: [OrderProxyService],
  exports: [OrderProxyService],
})
export class OrdersModule {}
