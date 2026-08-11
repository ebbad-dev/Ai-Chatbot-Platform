import { Injectable, Logger } from '@nestjs/common';
import { AiProvider, AiCompletionRequest, AiCompletionResponse } from '../interfaces/ai-provider.interface';

/**
 * MockAiProvider implementing deterministic grounded RAG response synthesis.
 * Guarantees zero developer cost and zero flaky tests while adhering strictly to injected facts.
 */
@Injectable()
export class MockAiProvider implements AiProvider {
  private readonly logger = new Logger(MockAiProvider.name);

  async generateCompletion(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    this.logger.debug('Generating deterministic grounded response via MockAiProvider...');
    
    const lastUserMsg = request.messages.length > 0 
      ? request.messages[request.messages.length - 1].content.toLowerCase() 
      : '';
    const sys = request.systemPrompt;

    let replyText = "I don't have enough information in our verified website catalog and documentation to answer that accurately. Please reach out to our print production specialists or check our website directly for further assistance.";

    // 1. Check if user is asking for order tracking
    if (sys.includes('LIVE REAL-TIME ORDER STATUS')) {
      const orderMatch = sys.match(/LIVE REAL-TIME ORDER STATUS \(Order #([^)]+)\):/);
      const statusMatch = sys.match(/- Status: ([^\n]+)/);
      const itemsMatch = sys.match(/- Items: ([^\n]+)/);
      const trackMatch = sys.match(/- Tracking Number: ([^\n]+)/);
      
      const ordId = orderMatch ? orderMatch[1] : 'Unknown';
      const status = statusMatch ? statusMatch[1] : 'In Production';
      const items = itemsMatch ? itemsMatch[1] : 'Custom Print Order';
      const track = trackMatch ? trackMatch[1] : 'N/A';
      
      replyText = `📦 **Order Status (#${ordId}):** Your order is currently **${status}**.\n\n• **Items:** ${items}\n• **Tracking ID:** ${track}\n\nOur prepress and shipping teams are actively monitoring fulfillment! Let us know if you have additional formatting questions.`;
    } 
    // 2. Check if prompt requests order number
    else if (sys.includes('The visitor wants to check an order status but has not provided a valid order tracking number')) {
      replyText = "I can help you check the real-time fulfillment status of your print order! Please enter your custom PrintEZ order tracking number below (for example: **#ORD-7721** or your order confirmation code).";
    }
    // 3. Check for grounded products in context
    else if (sys.includes('MATCHED PRODUCT CATALOG ITEMS')) {
      const lines = sys.split('\n');
      const products: string[] = [];
      for (const line of lines) {
        if (line.trim().startsWith('• ')) {
          products.push(line.trim().substring(2));
        }
      }
      
      if (lastUserMsg.includes('price') || lastUserMsg.includes('cost') || lastUserMsg.includes('how much')) {
        replyText = `Based on our current print catalog, here is our commercial pricing Breakdown:\n\n` +
          products.map(p => `• **${p.split(' - ')[0]}**`).join('\n') +
          `\n\nCommercial bulk runs over 250 units automatically qualify for wholesale tier discounting up to 40% off!`;
      } else {
        replyText = `Here are our matching high-resolution custom print options available for volume ordering:\n\n` +
          products.map(p => `• **${p}**`).join('\n') +
          `\n\nAll print materials undergo rigorous 300 DPI pre-press inspection with guaranteed turnaround!`;
      }
    }
    // 3b. Check for product categories
    else if (sys.includes('AVAILABLE PRODUCT CATEGORIES')) {
      replyText = "Here are the product categories we offer:\n\n";
      const lines = sys.split('\n');
      for (const line of lines) {
        if (line.trim().startsWith('- ')) {
          replyText += `${line.trim()}\n`;
        }
      }
      replyText += "\nWhich category would you like to explore?";
    }
    // 3c. Check for order intent
    else if (sys.includes('BRAND NEW ORDER OR REORDER')) {
      replyText = "I can help you place that order right away! Please fill out the secure checkout form below to provide your details and finalize your purchase.";
    }
    // 4. Check for FAQs or Documentation Chunks
    else if (sys.includes('MERCHANT FREQUENTLY ASKED QUESTIONS:') || sys.includes('WEBSITE DOCUMENTATION EXCERPTS:')) {
      const lines = sys.split('\n');
      let foundExcerpt = '';
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('A: ')) {
          foundExcerpt = lines[i].substring(3);
          break;
        } else if (lines[i].startsWith('[Excerpts from:')) {
          foundExcerpt = lines[i + 1] || 'Verified custom print SLAs and shipping policies apply.';
          break;
        }
      }
      if (foundExcerpt) {
        replyText = `According to our verified merchant policy:\n\n"${foundExcerpt}"\n\nLet our print production specialists know if you need any tailored customizations or bulk sample kits!`;
      }
    }
    // 5. Check for greetings
    else if (lastUserMsg.includes('hi') || lastUserMsg.includes('hello') || lastUserMsg.includes('hey') || lastUserMsg.includes('morning') || lastUserMsg.includes('afternoon')) {
      replyText = "Hi there! 👋 I'm your PrintEZ AI Assistant working alongside our custom print production specialists. How can we assist you with your print materials or order fulfillment today?";
    }

    return {
      content: replyText,
      provider: 'MockAiProvider',
      model: 'printez-rag-simulator-v1',
      usage: {
        promptTokens: request.systemPrompt.length / 4,
        completionTokens: replyText.length / 4,
        totalTokens: (request.systemPrompt.length + replyText.length) / 4,
      },
    };
  }
}
