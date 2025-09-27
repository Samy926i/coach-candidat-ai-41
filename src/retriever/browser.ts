import puppeteer, { Browser, Page } from 'puppeteer-core';

export interface BrowserConfig {
  lightpandaWs?: string;
  userAgent?: string;
  timeout?: number;
  httpProxy?: string;
  httpsProxy?: string;
}

export class BrowserManager {
  private browser: Browser | null = null;
  private config: BrowserConfig;

  constructor(config: BrowserConfig = {}) {
    this.config = {
      timeout: 30000,
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ...config
    };
  }

  async connect(): Promise<Browser> {
    if (this.browser) {
      return this.browser;
    }

    const { lightpandaWs, userAgent } = this.config;

    if (!lightpandaWs) {
      throw new Error('LIGHTPANDA_WS environment variable is required');
    }

    try {
      this.browser = await puppeteer.connect({
        browserWSEndpoint: lightpandaWs,
        defaultViewport: { width: 1920, height: 1080 }
      });

      return this.browser;
    } catch (error) {
      throw new Error(`Failed to connect to Lightpanda browser: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async newPage(): Promise<Page> {
    const browser = await this.connect();
    const page = await browser.newPage();
    
    // Set user agent if provided
    if (this.config.userAgent) {
      await page.setUserAgent(this.config.userAgent);
    }
    
    // Set timeout
    page.setDefaultTimeout(this.config.timeout || 30000);

    // Handle cookie banners and common overlays
    await this.setupPageDefaults(page);

    return page;
  }

  private async setupPageDefaults(page: Page): Promise<void> {
    // Block unnecessary resources to speed up loading
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      if (['image', 'media', 'font', 'stylesheet'].includes(resourceType)) {
        request.abort();
      } else {
        request.continue();
      }
    });

    // Add common cookie banner dismissal scripts
    await page.evaluateOnNewDocument(() => {
      const dismissCookieBanner = () => {
        const selectors = [
          '[id*="cookie"] button',
          '[class*="cookie"] button',
          '[class*="consent"] button',
          '[data-testid*="accept"]',
          'button[aria-label*="Accept"]',
          'button[aria-label*="Agree"]',
          '.gdpr-accept',
          '.accept-cookies',
          '#onetrust-accept-btn-handler',
          '.ot-floating-button__close'
        ];

        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          for (const element of elements) {
            const text = element.textContent?.toLowerCase() || '';
            if (text.includes('accept') || text.includes('agree') || text.includes('ok')) {
              (element as HTMLElement).click();
              return true;
            }
          }
        }
        return false;
      };

      // Try to dismiss banner after a short delay
      setTimeout(dismissCookieBanner, 2000);
      setTimeout(dismissCookieBanner, 5000);
    });
  }

  async navigateWithRetry(page: Page, url: string, maxRetries = 3): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await page.goto(url, {
          waitUntil: ['networkidle0', 'domcontentloaded'],
          timeout: this.config.timeout
        });

        // Wait a bit and try to dismiss cookie banners
        await new Promise(resolve => setTimeout(resolve, 3000));
        await this.dismissCookieBanners(page);
        
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt === maxRetries) break;
        
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, attempt * 2000));
      }
    }

    throw new Error(`Failed to navigate to ${url} after ${maxRetries} attempts: ${lastError?.message}`);
  }

  private async dismissCookieBanners(page: Page): Promise<void> {
    try {
      const cookieSelectors = [
        '[id*="cookie"] button',
        '[class*="cookie"] button',
        '[class*="consent"] button',
        '[data-testid*="accept"]',
        'button[aria-label*="Accept"]',
        'button[aria-label*="Agree"]',
        '.gdpr-accept',
        '.accept-cookies',
        '#onetrust-accept-btn-handler'
      ];

      for (const selector of cookieSelectors) {
        try {
          const buttons = await page.$$(selector);
          for (const button of buttons) {
            const text = await button.evaluate(el => el.textContent?.toLowerCase() || '');
            if (text.includes('accept') || text.includes('agree') || text.includes('ok')) {
              await button.click();
              await new Promise(resolve => setTimeout(resolve, 1000));
              break;
            }
          }
        } catch {
          // Ignore individual selector failures
        }
      }
    } catch {
      // Ignore cookie banner dismissal failures
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
