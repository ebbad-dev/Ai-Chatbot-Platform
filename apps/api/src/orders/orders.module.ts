import { Module, forwardRef } from '@nestjs/common';
import { ConnectorsModule } from '../connectors/connectors.module';
import { ChatbotsModule } from '../chatbots/chatbots.module';
import { OrderProxyService } from './services/order-proxy.service';
import { OrdersController } from './orders.controller';

/**
 * Orders Module managing secure, stateless, real-time e-commerce order checkups.
 */
@Module({
  imports: [ConnectorsModule, forwardRef(() => ChatbotsModule)],
  controllers: [OrdersController],
  providers: [OrderProxyService],
  exports: [OrderProxyService],
})
export class OrdersModule {}
