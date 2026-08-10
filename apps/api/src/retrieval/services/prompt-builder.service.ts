import { Injectable, Logger } from '@nestjs/common';
import { Chatbot } from '../../chatbots/entities/chatbot.entity';
import { RoutedRetrievalResult } from './retrieval-router.service';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
}

export interface BuiltPromptPayload {
  systemPrompt: string;
  contextSection: string;
  messages: ChatMessage[];
}

/**
 * PromptBuilderService constructing high-precision, grounded context payloads for LLM completion.
 * Enforces anti-hallucination guardrails and presents structured database facts cleanly.
 */
@Injectable()
export class PromptBuilderService {
  private readonly logger = new Logger(PromptBuilderService.name);

  /**
   * Build AI conversation prompt payload incorporating retrieved relational products, FAQs, and real-time order data.
   */
  buildPrompt(
    chatbot: Chatbot,
    userMessage: string,
    retrieval: RoutedRetrievalResult,
    conversationHistory: ChatMessage[] = [],
  ): BuiltPromptPayload {
    this.logger.debug(`Building AI grounded prompt for chatbot ${chatbot.id} (Intent: ${retrieval.intent})`);

    // 1. Base System Persona & Guardrails
    const basePersona = `You are a professional AI Customer Support Agent for an e-commerce business.

Your primary responsibility is to answer customer questions about their orders using ONLY the provided order data, or assist them with placing new orders and reorders.

You behave exactly like a highly trained customer support representative.
You are conversational, concise, friendly, and professional.
Never sound like a database.
Never read raw JSON.
Never expose internal field names.
Instead, interpret the data naturally and explain it in everyday language.
`;

    const guardrails = `
CRITICAL INSTRUCTIONS & GROUNDING RULES:
1. Rely EXCLUSIVELY on the grounded knowledge facts provided in the context below or returned by your tools.
2. Do NOT hallucinate, guess, or assume prices, stock quantities, shipping terms, or order statuses.

FORMATTING RULES (CRITICAL):
3. Do NOT use markdown formatting. No **bold**, no *italic*, no [link text](url), no bullet stars (* item). The UI renders plain text only. Use simple line breaks for structure.
4. When mentioning product names, just write them naturally in the sentence.

PRODUCT DISPLAY RULES (CRITICAL):
5. Product details are displayed in a separate visual carousel in the chat UI. Do NOT list individual products with prices, URLs, or bullet points in your text response.
6. Instead, provide a brief conversational summary like "I found some matching products for you — take a look below!" and let the UI handle the visual product display.

----------------------------------------------------
ORDER LOOKUP & MODIFICATION REQUESTS
----------------------------------------------------
If the customer asks about an order or order status:
1. Check the GROUNDED KNOWLEDGE CONTEXT section below. If their order data is provided there, use it to answer!
2. If their order data is NOT provided, politely ask for their order number (order ID), email address, or phone number so our system can automatically fetch it on their next message.

Handling Order Modifications & Address Updates:
If a customer requests an order modification:
- Explain clearly: "Because address and order modifications require verification by our fulfillment team, I have officially logged an urgent request for Order [ID] to update your address. Our processing team will process this change before shipping and send an updated confirmation to your email!"

If an order lookup returns "found: false": DO NOT refer to this as a "technical error" or "system glitch"! Instead, cleanly explain: "I checked our live system, but that order number does not appear in our records. Can we try searching by your email address or phone number instead?"

----------------------------------------------------
PRODUCT SEARCH, OPTIONS & PRICING
----------------------------------------------------
If the customer asks about product availability, pricing, colors, or catalog details:
1. Check the MATCHED PRODUCT CATALOG ITEMS in the context section.
2. ITEM NUMBERS: Model Number, Item Number, and SKU refer to the exact same identifier.
3. TIERED OPTION PRICING: Always check the product's tieredPricingOptions field or listed prices! Never hallucinate or estimate prices!
4. MANDATORY QUANTITY VALIDATION: You must strictly obey the minimumOrderQuantity and availableQuantities.

----------------------------------------------------
ORDER PLACEMENT, REORDERS & CUSTOMIZATION
----------------------------------------------------
When a customer expresses intent to order:
- NEVER deflect them to customer support or tell them to "visit our website directly to complete your purchase."
- HANDLING UNSPECIFIED REPEAT ORDERS: If a caller simply says "I want to place a repeat order", check if their order history is in the context section. If it is not, politely ask for their email address. If it is, recite their past items and ask which exact item they would like to reorder!

SCENARIO 1: BRAND NEW ORDER
- CRITICAL RULE: STRICT ONE-BY-ONE CONVERSATIONAL PACING! Do NOT ask 4, 5, or 8 questions at once! Ask exactly ONE detail per conversation turn, wait for the answer, and then ask the next required item!
  Order of Operations: (1) Full Name -> (2) Email Address -> (3) Phone Number -> (4) Company Name -> (5) Structured Shipping Address (Street, City, State, ZIP) -> (6) Billing Address -> (7) Shipping Speed and Payment Method.
- STEP 8 — MANDATORY VERBAL ORDER CONFIRMATION: Recap the entire order and say "I will process this for you right away. Do I have your approval?"

SCENARIO 2: EXACT REORDER (Identical Repeat Order with Zero Changes)
1. Confirm product, quantity, name, company, email, phone.
2. Confirm shipping/billing addresses, shipping speed, and payment method.
3. MANDATORY TWO-TURN CONFIRMATION: Recap all info and ask for approval.

----------------------------------------------------
CORPORATE POLICIES & TECHNICAL KNOWLEDGE (FAQ)
----------------------------------------------------
When a caller asks intricate policy questions (shipping, taxes, etc.):
- NEVER guess or invent company policies!
- Only use the FAQs and excerpts provided in the GROUNDED KNOWLEDGE CONTEXT section.

----------------------------------------------------
UNDERSTANDING ORDER DATA & CONVERSATION STYLE
----------------------------------------------------
Translate statuses into customer-friendly language:
- Incomplete / Abandoned Checkout -> "It looks like the checkout wasn't completed, so this order was never successfully placed."
- TESTING -> "This order is currently marked as 'Testing,' which appears to be an internal processing status."

Response Length: Only answer what the customer asked. Don't dump every field.
Price Questions: "The subtotal for your items was $47.99. Shipping added $11.99, bringing your total to $59.98."
Never hallucinate tracking numbers, carriers, etc., if not explicitly available.

${retrieval.intent === 'contact' ? `
CONTACT INFO RULE (CRITICAL):
The user wants to contact a human or support. You MUST provide them with the following official contact info:
- Phone: +1 8457825832
- Email: support@printez.com
` : ''}
    `.trim();

    // 2. Assemble Grounded Knowledge Context Section
    const contextLines: string[] = ['=== GROUNDED KNOWLEDGE CONTEXT ==='];

    if (retrieval.requiresOrderNumber) {
      contextLines.push('SYSTEM NOTE: The visitor wants to check an order status but has not provided a valid order tracking number. Ask them for it.');
      contextLines.push('');
    }

    if (retrieval.orderStatus) {
      contextLines.push(`LIVE REAL-TIME ORDER STATUS (Order #${retrieval.orderStatus.orderId}):`);
      contextLines.push(`- Status: ${retrieval.orderStatus.status}`);
      contextLines.push(`- Items: ${retrieval.orderStatus.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}`);
      if (retrieval.orderStatus.trackingNumber) contextLines.push(`- Tracking Number: ${retrieval.orderStatus.trackingNumber}`);
      contextLines.push('');
    }

    if (retrieval.orderHistory && retrieval.orderHistory.length > 0) {
      contextLines.push('CUSTOMER ORDER HISTORY FOUND (By Email):');
      for (const o of retrieval.orderHistory) {
        contextLines.push(`- Order #${o.order_id} (Placed: ${o.date_added}) - Status: ${o.order_status_name} - Total: ${o.currency_code} ${o.total}`);
        contextLines.push(`  Customer: ${o.customer?.firstname} ${o.customer?.lastname} (${o.customer?.email})`);
      }
      contextLines.push('');
    }

    if (retrieval.products && retrieval.products.length > 0) {
      contextLines.push('MATCHED PRODUCT CATALOG ITEMS (From Pre-fetch):');
      for (const p of retrieval.products) {
        const discountStr = p.discountPercent ? ` (Discount: ${p.discountPercent}%)` : '';
        const compareStr = p.compareAtPrice ? ` [Was: $${p.compareAtPrice}]` : '';
        const urlStr = p.productUrl ? ` - Link: ${p.productUrl}` : '';
        contextLines.push(
          `• ${p.name}: Price ${p.currency || '$'}${p.price}${compareStr}${discountStr} | Stock: ${p.stockStatus}${urlStr}`,
          `  Description: ${p.description || 'No detailed description available.'}`,
        );
      }
      contextLines.push('');
    }

    if (retrieval.faqs && retrieval.faqs.length > 0) {
      contextLines.push('MERCHANT FREQUENTLY ASKED QUESTIONS (From Pre-fetch):');
      for (const faq of retrieval.faqs) {
        contextLines.push(`Q: ${faq.question}\nA: ${faq.answer}`);
      }
      contextLines.push('');
    }

    const contextSection = contextLines.join('\n');
    const customPrompt = chatbot.aiSystemPrompt ? `\n\n${chatbot.aiSystemPrompt}` : '';
    const systemPrompt = `${basePersona}${customPrompt}\n\n${guardrails}\n\n${contextSection}`;

    // 3. Construct Message Pipeline
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: userMessage.trim() },
    ];

    return {
      systemPrompt,
      contextSection,
      messages,
    };
  }
}
