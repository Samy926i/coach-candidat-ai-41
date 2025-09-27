// Use native fetch in Node.js 18+ or polyfill
const fetch = globalThis.fetch || require('node-fetch');

export interface LightpandaCloudConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  userAgent?: string;
}

export interface LightpandaResponse {
  success: boolean;
  data?: {
    html: string;
    screenshot?: string;
    pdf?: string;
    metadata?: any;
  };
  error?: string;
}

export class LightpandaCloudClient {
  private config: Required<LightpandaCloudConfig>;

  constructor(config: LightpandaCloudConfig) {
    this.config = {
      baseUrl: 'https://api.lightpanda.io/v1',
      timeout: 30000,
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ...config
    };
  }

  async scrape(url: string, options: {
    waitForSelector?: string;
    waitTime?: number;
    screenshots?: boolean;
    javascript?: boolean;
    customHeaders?: Record<string, string>;
  } = {}): Promise<LightpandaResponse> {
    try {
      const requestBody = {
        url,
        options: {
          userAgent: this.config.userAgent,
          timeout: this.config.timeout,
          waitTime: options.waitTime || 3000,
          javascript: options.javascript !== false, // Enable JS by default
          screenshots: options.screenshots || false,
          waitForSelector: options.waitForSelector,
          customHeaders: options.customHeaders || {}
        }
      };

      const response = await fetch(`${this.config.baseUrl}/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          'User-Agent': 'job-data-retriever/1.0'
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(this.config.timeout)
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`
        };
      }

      const result = await response.json();
      
      return {
        success: true,
        data: result
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async batchScrape(urls: string[], options: {
    concurrent?: number;
    waitTime?: number;
  } = {}): Promise<Record<string, LightpandaResponse>> {
    const concurrent = options.concurrent || 3;
    const results: Record<string, LightpandaResponse> = {};
    
    // Process URLs in batches to respect rate limits
    for (let i = 0; i < urls.length; i += concurrent) {
      const batch = urls.slice(i, i + concurrent);
      const batchPromises = batch.map(async url => {
        const result = await this.scrape(url, options);
        return { url, result };
      });

      const batchResults = await Promise.all(batchPromises);
      
      for (const { url, result } of batchResults) {
        results[url] = result;
      }

      // Small delay between batches to be polite
      if (i + concurrent < urls.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }
}
