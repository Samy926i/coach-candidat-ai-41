#!/usr/bin/env tsx
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../src/retriever/index");
const schema_1 = require("../src/retriever/schema");
// Test job URLs - using well-known job boards with likely stable structure
const TEST_URLS = [
    // Test with a simple company careers page
    'https://jobs.github.com/positions/123', // GitHub (if available)
    // Fallback test URLs - these should be actual job postings
    'https://stackoverflow.com/jobs/123', // StackOverflow (if available)
    'https://remote.co/job/123' // Remote.co (if available)
];
class SmokeTestRunner {
    lightpandaWs;
    constructor() {
        this.lightpandaWs = process.env.LIGHTPANDA_WS || 'ws://localhost:9222/devtools/browser';
    }
    async runTests() {
        console.log('🚀 Starting smoke tests for job data retriever...\n');
        const results = [];
        for (const url of TEST_URLS) {
            console.log(`Testing: ${url}`);
            const result = await this.testUrl(url);
            results.push(result);
            this.printResult(result);
            console.log('---');
        }
        return results;
    }
    async testUrl(url) {
        const startTime = Date.now();
        try {
            const retriever = new index_1.JobRetriever({
                jobUrl: url,
                lightpandaWs: this.lightpandaWs,
                timeout: 15000 // Shorter timeout for tests
            });
            const result = await retriever.retrieve();
            const executionTime = Date.now() - startTime;
            // Validate against schema
            let validJson = false;
            try {
                schema_1.JobDataSchema.parse(result);
                validJson = true;
            }
            catch (validationError) {
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
        }
        catch (error) {
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
    printResult(result) {
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
    printSummary(results) {
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
        }
        else {
            console.log('⚠️  Some tests failed. Check the logs above for details.');
        }
    }
}
// Simple manual test with a mock URL if no Lightpanda is available
async function runBasicTest() {
    console.log('🧪 Running basic smoke test...\n');
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
                agent: 'lightpanda+puppeteer'
            }
        };
        const validated = schema_1.JobDataSchema.parse(mockData);
        console.log('✅ Schema validation works correctly');
        console.log('✅ Data normalization works correctly');
        console.log('\n📄 Sample output structure:');
        console.log(JSON.stringify(validated, null, 2));
    }
    catch (error) {
        console.error('❌ Basic test failed:', error);
        process.exit(1);
    }
}
async function main() {
    try {
        if (!process.env.LIGHTPANDA_WS) {
            console.log('ℹ️  LIGHTPANDA_WS not set, running basic schema test only...\n');
            await runBasicTest();
            return;
        }
        const runner = new SmokeTestRunner();
        const results = await runner.runTests();
        runner['printSummary'](results);
        // Exit with error code if any tests failed
        const hasFailures = results.some(r => !r.success || !r.validJson);
        if (hasFailures) {
            process.exit(1);
        }
    }
    catch (error) {
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
//# sourceMappingURL=smoke.js.map