#!/usr/bin/env node

import { BrowserManager } from './browser';
import { JobExtractor } from './extractJob';
import { CompanyEnricher } from './enrichCompany';
import { DataNormalizer } from './normalize';
import { JobDataSchema, JobData, Job, Company, Metadata } from './schema';

interface Config {
  jobUrl: string;
  lightpandaToken: string;
  userAgent?: string;
  timeout?: number;
  browser?: 'chrome' | 'lightpanda';
  proxy?: 'datacenter';
  country?: string;
}

class JobRetrieverCloud {
  private config: Config;
  private browserManager: BrowserManager;

  constructor(config: Config) {
    this.config = config;
    
    // Construct Lightpanda Cloud CDP WebSocket URL
    const wsUrl = this.buildLightpandaCloudUrl();
    
    this.browserManager = new BrowserManager({
      lightpandaWs: wsUrl,
      userAgent: config.userAgent,
      timeout: config.timeout
    });
  }

  private buildLightpandaCloudUrl(): string {
    const baseUrl = 'wss://cloud.lightpanda.io/ws';
    const params = new URLSearchParams();
    
    params.append('token', this.config.lightpandaToken);
    
    if (this.config.browser) {
      params.append('browser', this.config.browser);
    }
    
    if (this.config.proxy) {
      params.append('proxy', this.config.proxy);
    }
    
    if (this.config.country) {
      params.append('country', this.config.country);
    }
    
    return `${baseUrl}?${params.toString()}`;
  }

  async retrieve(): Promise<JobData> {
    const partialData: {
      job?: Partial<Job>;
      company?: Partial<Company>;
      metadata?: Partial<Metadata>;
    } = {
      job: { source_url: this.config.jobUrl },
      company: {},
      metadata: {
        scraped_at: new Date().toISOString(),
        agent: 'lightpanda-cloud-cdp+puppeteer',
        notes: []
      }
    };

    let page;

    try {
      console.log(`🌐 Connecting to Lightpanda Cloud CDP...`);
      
      // Step 1: Navigate to job page
      page = await this.browserManager.newPage();
      console.log(`📄 Scraping job page: ${this.config.jobUrl}`);
      await this.browserManager.navigateWithRetry(page, this.config.jobUrl);

      // Step 2: Extract job data
      const jobExtractor = new JobExtractor(page);
      partialData.job = await jobExtractor.extractJob(this.config.jobUrl);

      // Step 3: Extract hiring organization info from job page
      let hiringOrgName = '';
      let hiringOrgUrl = '';

      if (partialData.job?.raw_schema_org) {
        const schemaOrg = partialData.job.raw_schema_org as any;
        if (schemaOrg.hiringOrganization) {
          hiringOrgName = schemaOrg.hiringOrganization.name || '';
          hiringOrgUrl = schemaOrg.hiringOrganization.url || '';
        }
      }

      // Step 4: Enrich company data
      console.log(`🏢 Enriching company data for: ${hiringOrgName || partialData.job?.title || 'Unknown Company'}`);
      const companyEnricher = new CompanyEnricher(this.browserManager);
      partialData.company = await companyEnricher.enrichCompany(
        page,
        hiringOrgName,
        hiringOrgUrl
      );

      // Step 5: Normalize and validate data
      const normalizedData = DataNormalizer.normalize(partialData);
      
      // Step 6: Validate against schema
      const result = JobDataSchema.parse(normalizedData);
      
      console.log(`✅ Successfully extracted job data: ${result.job.title || 'Job Title'}`);
      return result;

    } catch (error) {
      // On error, return partial data with error notes
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error during extraction: ${errorMessage}`);
      
      if (!partialData.metadata) partialData.metadata = { notes: [] };
      if (!partialData.metadata.notes) partialData.metadata.notes = [];
      partialData.metadata.notes.push(`Error during extraction: ${errorMessage}`);
      
      // Still normalize what we have
      const normalizedData = DataNormalizer.normalize(partialData);
      
      try {
        return JobDataSchema.parse(normalizedData);
      } catch (validationError) {
        // If validation fails, create minimal valid structure
        return JobDataSchema.parse({
          job: { source_url: this.config.jobUrl },
          company: {},
          metadata: {
            scraped_at: new Date().toISOString(),
            agent: 'lightpanda-cloud-cdp+puppeteer',
            notes: [
              `Error during extraction: ${errorMessage}`,
              `Validation error: ${validationError instanceof Error ? validationError.message : String(validationError)}`
            ]
          }
        });
      }
    } finally {
      if (page) {
        await page.close();
      }
      await this.browserManager.close();
    }
  }
}

function parseConfig(): Config {
  // Get job URL from environment variable or command line
  let jobUrl = process.env.JOB_URL || '';
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--job-url' && i + 1 < args.length) {
      jobUrl = args[i + 1];
      break;
    }
    if (args[i].startsWith('--job-url=')) {
      jobUrl = args[i].substring('--job-url='.length);
      break;
    }
  }

  // Validate required inputs
  if (!jobUrl) {
    console.error('❌ JOB_URL environment variable or --job-url argument is required');
    process.exit(1);
  }

  // Support both LIGHTPANDA_TOKEN and LIGHTPANDA_API_KEY for compatibility
  const lightpandaToken = process.env.LIGHTPANDA_TOKEN || process.env.LIGHTPANDA_API_KEY;
  if (!lightpandaToken) {
    console.error('❌ LIGHTPANDA_TOKEN (or LIGHTPANDA_API_KEY) environment variable is required');
    console.error('ℹ️  Get your token from: https://lightpanda.io/#cloud-offer');
    console.error('ℹ️  Use CDP endpoint: wss://cloud.lightpanda.io/ws?token=YOUR_TOKEN');
    process.exit(1);
  }

  return {
    jobUrl,
    lightpandaToken,
    userAgent: process.env.USER_AGENT,
    timeout: process.env.TIMEOUT ? parseInt(process.env.TIMEOUT) : 30000,
    browser: (process.env.LIGHTPANDA_BROWSER as 'chrome' | 'lightpanda') || 'chrome',
    proxy: process.env.LIGHTPANDA_PROXY as 'datacenter' | undefined,
    country: process.env.LIGHTPANDA_COUNTRY
  };
}

async function main() {
  try {
    console.log('🚀 Job Data Retriever (Lightpanda Cloud CDP)');
    console.log('=============================================');
    
    const config = parseConfig();
    const retriever = new JobRetrieverCloud(config);
    const result = await retriever.retrieve();
    
    // Output exactly one JSON object to stdout
    console.log('\n📄 Extracted Job Data:');
    console.log('======================');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    // Even on critical errors, output valid JSON
    const errorResult = JobDataSchema.parse({
      job: { source_url: process.env.JOB_URL || '' },
      company: {},
      metadata: {
        scraped_at: new Date().toISOString(),
        agent: 'lightpanda-cloud-cdp+puppeteer',
        notes: [`Critical error: ${error instanceof Error ? error.message : String(error)}`]
      }
    });
    
    console.log(JSON.stringify(errorResult, null, 2));
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    const errorResult = JobDataSchema.parse({
      job: { source_url: process.env.JOB_URL || '' },
      company: {},
      metadata: {
        scraped_at: new Date().toISOString(),
        agent: 'lightpanda-cloud-cdp+puppeteer',
        notes: [`Fatal error: ${error instanceof Error ? error.message : String(error)}`]
      }
    });
    
    console.log(JSON.stringify(errorResult, null, 2));
    process.exit(1);
  });
}

export { JobRetrieverCloud };
export type { Config };
