/**
 * Lightpanda scraping integration using CDP (Chrome DevTools Protocol)
 */

import { sleep, getRandomDelay } from './utils.ts';

interface ScrapedData {
  text: string;
  title?: string;
  canonical?: string;
  metaTags: Record<string, string>;
  jsonLD: any[];
  url: string;
}

export async function scrapeJobPage(url: string): Promise<ScrapedData> {
  console.log(`[lightpanda] Scraping URL: ${url}`);
  
  // Try CDP direct connection first, then fallback to HTTP service
  try {
    return await scrapeCDPDirect(url);
  } catch (error: any) {
    console.log(`[lightpanda] CDP direct failed: ${error.message}`);
    console.log(`[lightpanda] Trying HTTP fallback...`);
    return await scrapeHTTPFallback(url);
  }
}

async function scrapeCDPDirect(url: string): Promise<ScrapedData> {
  const lightpandaWSE = Deno.env.get('LIGHTPANDA_WSE');
  
  if (!lightpandaWSE) {
    throw new Error('LIGHTPANDA_WSE environment variable not set');
  }

  console.log(`[lightpanda] Connecting to CDP: ${lightpandaWSE}`);
  
  const ws = new WebSocket(lightpandaWSE);
  
  return new Promise((resolve, reject) => {
    let messageId = 1;
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('CDP connection timeout'));
    }, 90000); // 90 second timeout

    ws.onopen = async () => {
      console.log('[lightpanda] CDP connection opened');
      
      try {
        // Create new page
        await sendCDPCommand(ws, 'Target.createTarget', {
          url: 'about:blank'
        }, messageId++);
        
        // Navigate to URL
        await sendCDPCommand(ws, 'Page.navigate', {
          url: url
        }, messageId++);
        
        // Wait for page load
        await sleep(5000);
        
        // Extract content
        const result = await sendCDPCommand(ws, 'Runtime.evaluate', {
          expression: `
            (() => {
              const extractJsonLD = () => {
                const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
                return scripts.map(script => {
                  try {
                    return JSON.parse(script.textContent || '');
                  } catch {
                    return null;
                  }
                }).filter(Boolean);
              };
              
              const extractMetaTags = () => {
                const metas = {};
                document.querySelectorAll('meta').forEach(meta => {
                  const name = meta.getAttribute('name') || meta.getAttribute('property');
                  const content = meta.getAttribute('content');
                  if (name && content) {
                    metas[name] = content;
                  }
                });
                return metas;
              };
              
              return {
                text: document.body?.innerText || '',
                title: document.title || '',
                canonical: document.querySelector('link[rel="canonical"]')?.href || '',
                metaTags: extractMetaTags(),
                jsonLD: extractJsonLD()
              };
            })()
          `
        }, messageId++);
        
        clearTimeout(timeout);
        ws.close();
        
        const scrapedData: ScrapedData = {
          ...result.result.value,
          url
        };
        
        console.log(`[lightpanda] Successfully scraped via CDP. Text length: ${scrapedData.text.length}`);
        resolve(scrapedData);
        
      } catch (error) {
        clearTimeout(timeout);
        ws.close();
        reject(error);
      }
    };
    
    ws.onerror = (error) => {
      clearTimeout(timeout);
      reject(new Error(`CDP WebSocket error: ${error}`));
    };
  });
}

async function scrapeHTTPFallback(url: string): Promise<ScrapedData> {
  const scraperUrl = Deno.env.get('SCRAPER_URL');
  
  if (!scraperUrl) {
    throw new Error('Both LIGHTPANDA_WSE and SCRAPER_URL are not configured');
  }
  
  console.log(`[lightpanda] Using HTTP fallback service: ${scraperUrl}`);
  
  // Add politeness delay
  await sleep(getRandomDelay());
  
  const response = await fetch(scraperUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Lightpanda Research Bot 1.0 (+https://example.com/bot)'
    },
    body: JSON.stringify({ url })
  });
  
  if (!response.ok) {
    throw new Error(`Scraper service returned ${response.status}: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  console.log(`[lightpanda] Successfully scraped via HTTP fallback. Text length: ${data.text?.length || 0}`);
  
  return {
    text: data.text || '',
    title: data.title || '',
    canonical: data.canonical || '',
    metaTags: data.metaTags || {},
    jsonLD: data.jsonLD || [],
    url
  };
}

async function sendCDPCommand(ws: WebSocket, method: string, params: any, id: number): Promise<any> {
  return new Promise((resolve, reject) => {
    const message = JSON.stringify({
      id,
      method,
      params
    });
    
    const handler = (event: MessageEvent) => {
      const response = JSON.parse(event.data);
      if (response.id === id) {
        ws.removeEventListener('message', handler);
        if (response.error) {
          reject(new Error(`CDP error: ${response.error.message}`));
        } else {
          resolve(response);
        }
      }
    };
    
    ws.addEventListener('message', handler);
    ws.send(message);
  });
}