import { Injectable, Logger } from '@nestjs/common';
import { AiProvider, AiCompletionRequest, AiCompletionResponse } from '../interfaces/ai-provider.interface';
import { MockAiProvider } from './mock-ai.provider';
import { AppConfigService } from '../../config/app-config.service';
import { fetch } from 'undici';

/**
 * HttpAiProvider bridging live Google Gemini, Groq, and OpenRouter APIs (free tier providers) via undici requests,
 * gracefully falling back to deterministic MockAiProvider when offline or when keys are unconfigured.
 */
@Injectable()
export class HttpAiProvider implements AiProvider {
  private readonly logger = new Logger(HttpAiProvider.name);
  private readonly mockProvider: MockAiProvider;

  constructor(private readonly config: AppConfigService) {
    this.mockProvider = new MockAiProvider();
  }

  async generateCompletion(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    const geminiKey = this.config.geminiApiKey;
    const groqKey = this.config.groqApiKey;
    const openRouterKey = this.config.openRouterApiKey;

    // 1. Attempt Google Gemini chat completion (~1500 free requests/day via Google AI Studio)
    if (geminiKey && geminiKey.length > 5) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: request.systemPrompt }] },
            contents: request.messages.map((m) => ({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.content }],
            })),
          }),
        });

        if (res.ok) {
          const data = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
          const content = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (content) {
            return {
              content,
              provider: 'Google Gemini (Free Tier)',
              model: 'gemini-1.5-flash-latest',
            };
          }
        } else {
          const err = await res.text();
          this.logger.warn(`Gemini API failed with status ${res.status}: ${err}`);
        }
      } catch (e: unknown) {
        this.logger.warn(`Gemini completion error: ${(e as Error).message}. Trying next provider...`);
      }
    }

    // 2. Attempt Groq chat completion (~30 RPM free via Llama 3.3)
    if (groqKey && (groqKey.startsWith('gsk_') || groqKey.length > 10)) {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: 'llama3-70b-8192',
            messages: [
              { role: 'system', content: request.systemPrompt },
              ...request.messages,
            ],
            temperature: request.temperature ?? 0.2,
            max_tokens: request.maxTokens ?? 500,
            ...(request.tools && request.tools.length > 0 ? { tools: request.tools, tool_choice: 'auto' } : {}),
          }),
        });

        if (res.ok) {
          const data = (await res.json()) as any;
          const choice = data?.choices?.[0]?.message;
          const content = choice?.content?.trim() || '';
          const toolCalls = choice?.tool_calls;
          
          if (content || (toolCalls && toolCalls.length > 0)) {
            return {
              content,
              provider: 'Groq (Free Tier Llama 3)',
              model: data?.model || 'llama3-70b-8192',
              toolCalls,
              usage: data?.usage ? {
                promptTokens: data.usage.prompt_tokens || 0,
                completionTokens: data.usage.completion_tokens || 0,
                totalTokens: data.usage.total_tokens || 0,
              } : undefined,
            };
          }
        } else {
          const err = await res.text();
          this.logger.warn(`Groq API failed with status ${res.status}: ${err}`);
        }
      } catch (e: unknown) {
        this.logger.warn(`Groq completion error: ${(e as Error).message}. Trying next provider...`);
      }
    }

    // 3. Attempt OpenRouter completion (Access to dozen+ free community models like Llama-3-8B:free)
    if (openRouterKey && openRouterKey.startsWith('sk-or-')) {
      try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openRouterKey}`,
            'HTTP-Referer': 'https://printez.com',
            'X-Title': 'PrintEZ AI Assistant',
          },
          body: JSON.stringify({
            model: 'meta-llama/llama-3.3-70b-instruct',
            messages: [
              { role: 'system', content: request.systemPrompt },
              ...request.messages,
            ],
            temperature: request.temperature ?? 0.2,
            max_tokens: request.maxTokens ?? 500,
            ...(request.tools && request.tools.length > 0 ? { tools: request.tools, tool_choice: 'auto' } : {}),
          }),
        });

        if (res.ok) {
          const data = (await res.json()) as any;
          const choice = data?.choices?.[0]?.message;
          const content = choice?.content?.trim() || '';
          const toolCalls = choice?.tool_calls;
          
          if (content || (toolCalls && toolCalls.length > 0)) {
            return {
              content,
              provider: 'OpenRouter (Community Models)',
              model: data?.model || 'meta-llama/llama-3.3-70b-instruct',
              toolCalls,
              usage: data?.usage ? {
                promptTokens: data.usage.prompt_tokens || 0,
                completionTokens: data.usage.completion_tokens || 0,
                totalTokens: data.usage.total_tokens || 0,
              } : undefined,
            };
          }
        } else {
          const err = await res.text();
          this.logger.warn(`OpenRouter API failed with status ${res.status}: ${err}`);
        }
      } catch (e: unknown) {
        this.logger.warn(`OpenRouter completion error: ${(e as Error).message}. Falling back to simulator.`);
      }
    }

    // 4. Clean fallback to deterministic RAG simulator for testing and cost-free local development
    return this.mockProvider.generateCompletion(request);
  }
}
