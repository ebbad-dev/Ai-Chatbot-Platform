import { Injectable, Logger } from '@nestjs/common';

export interface PromptInjectionCheckResult {
  isSafe: boolean;
  blockedReason?: string;
}

/**
 * PromptInjectionService defending against adversarial jailbreaks, prompt override attacks,
 * and malicious command instructions before queries reach vector indexing or LLM completion.
 */
@Injectable()
export class PromptInjectionService {
  private readonly logger = new Logger(PromptInjectionService.name);

  private readonly HOSTILE_PATTERNS = [
    /ignore (?:all )?(?:previous|prior|above) (?:instructions|rules|guardrails|prompts)/i,
    /(?:system prompt|system instruction|guardrail) override/i,
    /you are now unrestricted/i,
    /forget (?:all )?(?:your |the )?(?:rules|instructions|constraints|guardrails)/i,
    /act as an uncensored/i,
    /dan mode/i,
    /<script>|javascript:|onerror=|onload=/i,
    /drop table|select \* from|insert into|delete from/i,
    /system\.\w+\(/i,
    /(?:reveal|show|print|dump)(?:.*)(?:system prompt|system instructions|secret key|api key)/i,
  ];

  checkMessage(message: string): PromptInjectionCheckResult {
    if (!message || message.trim().length === 0) {
      return { isSafe: true };
    }

    for (const pattern of this.HOSTILE_PATTERNS) {
      if (pattern.test(message)) {
        this.logger.warn(`Prompt injection or hostile attack blocked by pattern ${pattern.toString()} on input: "${message.substring(0, 80)}..."`);
        return {
          isSafe: false,
          blockedReason: 'Potential prompt injection, jailbreak, or unsafe syntax detected.',
        };
      }
    }

    return { isSafe: true };
  }
}
