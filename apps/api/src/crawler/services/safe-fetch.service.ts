import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service';
import { Agent, request, buildConnector } from 'undici';
import * as dns from 'dns';
import * as ipaddr from 'ipaddr.js';

export interface FetchResult {
  content: string;
  contentType: string;
  status: number;
  finalUrl: string;
  error?: string;
}

@Injectable()
export class SafeFetchService {
  private readonly safeAgent: Agent;

  constructor(private readonly appConfig: AppConfigService) {
    const allowTestLoopback = this.appConfig.crawlerAllowTestLoopback;
    const isTestEnv = this.appConfig.nodeEnv === 'test';
    const defaultConnector = buildConnector({ rejectUnauthorized: true });

    this.safeAgent = new Agent({
      connect: (options, callback) => {
        const { hostname } = options;

        // 1. Resolve DNS
        dns.lookup(hostname, { all: true }, (err, addresses) => {
          if (err) {
            callback(err, null);
            return;
          }

          if (!addresses || addresses.length === 0) {
            callback(new Error(`DNS resolution failed for ${hostname}`), null);
            return;
          }

          // 2. Validate all resolved addresses against private/loopback SSRF targets
          for (const addrInfo of addresses) {
            const ip = addrInfo.address;
            if (this.isPrivateIp(ip, allowTestLoopback && isTestEnv)) {
              callback(new Error(`SSRF Blocked: Resolves to private IP ${ip}`), null);
              return;
            }
          }

          // 3. Delegate socket establishment to undici standard connector after SSRF verification
          defaultConnector(options, callback);
        });
      },
    });
  }

  /**
   * Safe fetch method with strict SSRF re-check, redirect checks, size caps, and timeouts.
   */
  async fetchSafe(
    url: string,
    baseOrigin: string,
    headers?: Record<string, string>,
  ): Promise<FetchResult> {
    try {
      return await this.followRedirectsSafe(url, baseOrigin, 0, headers, 'GET');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown fetch error';
      return { content: '', contentType: '', status: 0, finalUrl: url, error: msg };
    }
  }

  /**
   * Safe POST request.
   */
  async postSafe(
    url: string,
    baseOrigin: string,
    body: string,
    headers?: Record<string, string>,
  ): Promise<FetchResult> {
    try {
      return await this.followRedirectsSafe(url, baseOrigin, 0, headers, 'POST', body);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown fetch error';
      return { content: '', contentType: '', status: 0, finalUrl: url, error: msg };
    }
  }

  private async followRedirectsSafe(
    currentUrl: string,
    baseOrigin: string,
    redirectCount: number,
    customHeaders?: Record<string, string>,
    method: 'GET' | 'POST' = 'GET',
    body?: string,
  ): Promise<FetchResult> {
    if (redirectCount > this.appConfig.crawlerMaxRedirects) {
      return { content: '', contentType: '', status: 0, finalUrl: currentUrl, error: 'Too many redirects' };
    }

    // 1. URL Protocol & Port Checks
    const parsed = new URL(currentUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { content: '', contentType: '', status: 0, finalUrl: currentUrl, error: 'Unsupported protocol' };
    }

    if (parsed.username || parsed.password) {
      return { content: '', contentType: '', status: 0, finalUrl: currentUrl, error: 'URL contains credentials' };
    }

    const defaultPort = parsed.protocol === 'https:' ? 443 : 80;
    const port = parsed.port ? Number(parsed.port) : defaultPort;
    const allowTestLoopback = this.appConfig.crawlerAllowTestLoopback;
    const isTestEnv = this.appConfig.nodeEnv === 'test';

    // Strictly enforce unsafe ports block (only allow 80/443 unless test loopback is enabled)
    if (port !== 80 && port !== 443) {
      if (!(allowTestLoopback && isTestEnv)) {
        return { content: '', contentType: '', status: 0, finalUrl: currentUrl, error: 'Unsafe port rejected' };
      }
    }

    // Check same-origin constraint for redirects
    if (redirectCount > 0) {
      const currentOrigin = parsed.origin.toLowerCase();
      const expectedOrigin = new URL(baseOrigin).origin.toLowerCase();
      if (currentOrigin !== expectedOrigin) {
        return { content: '', contentType: '', status: 0, finalUrl: currentUrl, error: 'Redirected to external origin' };
      }
    }

    // 2. Perform GET request via undici with safe agent
    const timeoutMs = this.appConfig.crawlerTimeoutMs;
    const response = await request(currentUrl, {
      method,
      headers: {
        'User-Agent': 'AI-Chatbot-Crawler/1.0',
        'Accept': 'application/json,text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        ...customHeaders,
      },
      body,
      dispatcher: this.safeAgent,
      bodyTimeout: timeoutMs,
      headersTimeout: timeoutMs,
    });

    // 3. Handle Redirect Response Manually
    if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
      const redirectLocation = String(response.headers.location);
      const nextUrl = new URL(redirectLocation, currentUrl).toString();
      // Ensure body is consumed to free connection
      await response.body.dump();
      // Redirects typically downgrade POST to GET
      return this.followRedirectsSafe(nextUrl, baseOrigin, redirectCount + 1, customHeaders, 'GET');
    }

    // 4. Validate Content-Type
    const contentType = String(response.headers['content-type'] || '').toLowerCase();
    const isAllowedType =
      contentType.includes('text/html') ||
      contentType.includes('xml') ||
      contentType.includes('json') ||
      contentType.includes('application/javascript') ||
      contentType.includes('text/plain');

    if (!isAllowedType) {
      await response.body.dump();
      return { content: '', contentType, status: response.statusCode, finalUrl: currentUrl, error: 'Unsupported content type' };
    }

    // 5. Enforce Max Content Length during streaming
    const maxBytes = this.appConfig.crawlerMaxResponseSize;
    let byteCount = 0;
    const chunks: Buffer[] = [];

    for await (const chunk of response.body) {
      byteCount += chunk.length;
      if (byteCount > maxBytes) {
        response.body.destroy();
        return { content: '', contentType, status: response.statusCode, finalUrl: currentUrl, error: 'Response size limit exceeded' };
      }
      chunks.push(chunk);
    }

    const content = Buffer.concat(chunks).toString('utf-8');

    return {
      content,
      contentType,
      status: response.statusCode,
      finalUrl: currentUrl,
    };
  }

  private isPrivateIp(ipString: string, allowLocalhost: boolean): boolean {
    try {
      let addr = ipaddr.parse(ipString);

      // Handle IPv4-mapped IPv6 addresses (e.g. ::ffff:127.0.0.1)
      if (addr.kind() === 'ipv6' && (addr as ipaddr.IPv6).isIPv4MappedAddress()) {
        addr = (addr as ipaddr.IPv6).toIPv4Address();
      }

      const range = addr.range();

      if (range === 'loopback' && allowLocalhost) {
        return false;
      }

      const unsafeRanges = [
        'private',
        'loopback',
        'linkLocal',
        'uniqueLocal',
        'broadcast',
        'multicast',
        'carrierGradeNat',
        'unspecified',
      ];

      if (unsafeRanges.includes(range)) {
        return true;
      }

      // Explicit metadata endpoint check
      if (addr.kind() === 'ipv4' && ipString.startsWith('169.254.')) {
        return true;
      }

      return false;
    } catch {
      return true; // Block invalid IP addresses
    }
  }
}
