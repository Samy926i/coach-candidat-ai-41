#!/usr/bin/env node

import { BrowserManager } from './browser';
import { JobExtractor } from './extractJob';
import { CompanyEnricher } from './enrichCompany';
import { DataNormalizer } from './normalize';
import { JobDataSchema, JobData, Job, Company, Metadata } from './schema';

interface Config {
  jobUrl: string;
  lightpandaWs: string;
  userAgent?: string;
  httpProxy?: string;
  httpsProxy?: string;
  timeout?: number;
}

class JobRetriever {
  private config: Config;
  private browserManager: BrowserManager;

  constructor(config: Config) {
    this.config = config;
    this.browserManager = new BrowserManager({
      lightpandaWs: config.lightpandaWs,
      userAgent: config.userAgent,
      httpProxy: config.httpProxy,
      httpsProxy: config.httpsProxy,
      timeout: config.timeout
    });
  }

  async retrieve(): Promise<JobData> {
    const partialData: {
      job?: Partial<Job>;
      company?: Partial<Company>;
      metadata?: Partial<Metadata>;
    } = {
      job: {},
      company: {},
      metadata: {
        scraped_at: new Date().toISOString(),
        agent: 'lightpanda+puppeteer',
        notes: []
      }
    };

    let page;

    try {
      // Step 1: Navigate to job page
      page = await this.browserManager.newPage();
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
      
      return result;

    } catch (error) {
      // On error, return partial data with error notes
      const errorMessage = error instanceof Error ? error.message : String(error);
      
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
            agent: 'lightpanda+puppeteer',
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
    console.error('JOB_URL environment variable or --job-url argument is required');
    process.exit(1);
  }

  const lightpandaWs = process.env.LIGHTPANDA_WS;
  if (!lightpandaWs) {
    console.error('LIGHTPANDA_WS environment variable is required');
    process.exit(1);
  }

  return {
    jobUrl,
    lightpandaWs,
    userAgent: process.env.USER_AGENT,
    httpProxy: process.env.HTTP_PROXY,
    httpsProxy: process.env.HTTPS_PROXY,
    timeout: process.env.TIMEOUT ? parseInt(process.env.TIMEOUT) : 30000
  };
}

async function main() {
  try {
    const config = parseConfig();
    const retriever = new JobRetriever(config);
    const result = await retriever.retrieve();
    
    // Output exactly one JSON object to stdout
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    // Even on critical errors, output valid JSON
    const errorResult = JobDataSchema.parse({
      job: { source_url: process.env.JOB_URL || '' },
      company: {},
      metadata: {
        scraped_at: new Date().toISOString(),
        agent: 'lightpanda+puppeteer',
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
        agent: 'lightpanda+puppeteer',
        notes: [`Fatal error: ${error instanceof Error ? error.message : String(error)}`]
      }
    });
    
    console.log(JSON.stringify(errorResult, null, 2));
    process.exit(1);
  });
}

export { JobRetriever };
export type { Config };
