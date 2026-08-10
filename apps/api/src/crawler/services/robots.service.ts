import { Injectable, Logger } from '@nestjs/common';
import { SafeFetchService } from './safe-fetch.service';

@Injectable()
export class RobotsService {
  private readonly logger = new Logger(RobotsService.name);

  constructor(private readonly pageFetchService: SafeFetchService) {}

  /**
   * Very basic robots.txt parser for MVP.
   * Returns a boolean indicating if the given path is allowed for our user agent.
   * Currently treats User-agent: * generically and checks Disallow paths.
   */
  async isAllowed(url: string, baseOrigin: string): Promise<boolean> {
    try {
      const robotsUrl = new URL('/robots.txt', baseOrigin).toString();
      const result = await this.pageFetchService.fetchSafe(robotsUrl, baseOrigin);

      if (result.error || result.status !== 200 || !result.content) {
        // If we can't fetch robots.txt, assume it's allowed
        return true;
      }

      const targetPath = new URL(url).pathname;
      return this.parseRobotsTxt(result.content, targetPath);
    } catch (error: unknown) {
      this.logger.warn(`Failed to process robots.txt for ${baseOrigin}: ${(error as Error).message}`);
      return true;
    }
  }

  private parseRobotsTxt(content: string, targetPath: string): boolean {
    const lines = content.split('\n');
    let isApplicableAgent = false;
    let allowed = true;

    for (let line of lines) {
      line = line.split('#')[0].trim();
      if (!line) continue;

      const lowerLine = line.toLowerCase();
      if (lowerLine.startsWith('user-agent:')) {
        const agent = line.substring(11).trim().toLowerCase();
        // We match * or our specific agent
        isApplicableAgent = agent === '*' || agent === 'ai-chatbot-crawler';
      } else if (isApplicableAgent && lowerLine.startsWith('disallow:')) {
        const path = line.substring(9).trim();
        if (path.length > 0 && targetPath.startsWith(path)) {
          allowed = false;
        }
      } else if (isApplicableAgent && lowerLine.startsWith('allow:')) {
        const path = line.substring(6).trim();
        if (path.length > 0 && targetPath.startsWith(path)) {
           // allow overrides disallow if it matches
           allowed = true;
        }
      }
    }
    return allowed;
  }
}
