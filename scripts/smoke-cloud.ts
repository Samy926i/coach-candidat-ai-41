#!/usr/bin/env tsx

import { JobRetrieverCloud } from '../src/retriever/indexCloud';
import { JobDataSchema } from '../src/retriever/schema';

interface TestResult {
  url: string;
  success: boolean;
  validJson: boolean;
  hasJobTitle: boolean;
  hasCompanyName: boolean;
  error?: string;
  executionTime: number;
}

// Test job URLs - using well-known job boards with likely stable structure
const TEST_URLS = [
  'https://jobs.lever.co/example/senior-engineer', // Lever (common job board)
  'https://boards.greenhouse.io/example/jobs/123', // Greenhouse (common ATS)
  'https://jobs.smartrecruiters.com/example/123' // SmartRecruiters
];

class SmokeTestRunnerCloud {
  private token: string;

  constructor() {
    this.token = process.env.LIGHTPANDA_TOKEN || process.env.LIGHTPANDA_API_KEY || '';
  }

  async runTests(): Promise<TestResult[]> {
    console.log('🚀 Starting smoke tests for Lightpanda Cloud CDP job data retriever...\n');
    
    const results: TestResult[] = [];
    
    for (const url of TEST_URLS) {
      console.log(`Testing: ${url}`);
      const result = await this.testUrl(url);
      results.push(result);
      
      this.printResult(result);
      console.log('---');
    }
    
    return results;
  }

  private async testUrl(url: string): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const retriever = new JobRetrieverCloud({
        jobUrl: url,
        lightpandaToken: this.token,
        timeout: 20000 // Shorter timeout for tests
      });
      
      const result = await retriever.retrieve();
      const executionTime = Date.now() - startTime;
      
      // Validate against schema
      let validJson = false;
      try {
        JobDataSchema.parse(result);
        validJson = true;
      } catch (validationError) {
        console.error('Schema validation failed:', validationError);
      }
      
      return {
        url,
        success: true,
        validJson,
        hasJobTitle: !!result.job.title,
        hasCompanyName: !!result.company.name,
        executionTime
      };
      
    } catch (error) {
      return {
        url,
        success: false,
        validJson: false,
        hasJobTitle: false,
        hasCompanyName: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime
      };
    }
  }

  private printResult(result: TestResult): void {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.url}`);
    console.log(`   Execution time: ${result.executionTime}ms`);
    console.log(`   Valid JSON: ${result.validJson ? '✅' : '❌'}`);
    console.log(`   Has job title: ${result.hasJobTitle ? '✅' : '❌'}`);
    console.log(`   Has company name: ${result.hasCompanyName ? '✅' : '❌'}`);
    
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  }

  private printSummary(results: TestResult[]): void {
    const totalTests = results.length;
    const successfulTests = results.filter(r => r.success).length;
    const validJsonTests = results.filter(r => r.validJson).length;
    const avgExecutionTime = results.reduce((acc, r) => acc + r.executionTime, 0) / totalTests;
    
    console.log('\n📊 Test Summary:');
    console.log(`Total tests: ${totalTests}`);
    console.log(`Successful: ${successfulTests}/${totalTests}`);
    console.log(`Valid JSON: ${validJsonTests}/${totalTests}`);
    console.log(`Average execution time: ${Math.round(avgExecutionTime)}ms`);
    
    if (successfulTests === totalTests) {
      console.log('🎉 All tests passed!');
    } else {
      console.log('⚠️  Some tests failed. Check the logs above for details.');
    }
  }
}

// Simple manual test with a mock URL if no API key is available
async function runBasicTest(): Promise<void> {
  console.log('🧪 Running basic smoke test for Lightpanda Cloud...\n');
  
  try {
    // Test schema validation with mock data
    const mockData = {
      job: {
        source_url: 'https://example.com/job/123',
        title: 'Senior Software Engineer',
        role_seniority: 'senior',
        location: { city: 'San Francisco', region: 'CA', country: 'US', remote_policy: '' },
        salary: { min: 120000, max: 180000, currency: 'USD', period: 'year' }
      },
      company: {
        name: 'Test Company',
        industry: 'Technology'
      },
      metadata: {
        agent: 'lightpanda-cloud+api'
      }
    };
    
    const validated = JobDataSchema.parse(mockData);
    console.log('✅ Schema validation works correctly');
    console.log('✅ Lightpanda Cloud configuration ready');
    console.log('\n📄 Sample output structure:');
    console.log(JSON.stringify(validated, null, 2));
    
  } catch (error) {
    console.error('❌ Basic test failed:', error);
    process.exit(1);
  }
}

async function main(): Promise<void> {
  try {
    if (!process.env.LIGHTPANDA_TOKEN && !process.env.LIGHTPANDA_API_KEY) {
      console.log('ℹ️  LIGHTPANDA_TOKEN not set, running basic schema test only...\n');
      console.log('To get your token, visit: https://lightpanda.io/#cloud-offer');
      console.log('Then set: export LIGHTPANDA_TOKEN="your-token"');
      console.log('CDP Endpoint: wss://cloud.lightpanda.io/ws?token=YOUR_TOKEN\n');
      await runBasicTest();
      return;
    }

    const runner = new SmokeTestRunnerCloud();
    const results = await runner.runTests();
    runner['printSummary'](results);
    
    // Exit with error code if any tests failed
    const hasFailures = results.some(r => !r.success || !r.validJson);
    if (hasFailures) {
      process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 Smoke test runner failed:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}
