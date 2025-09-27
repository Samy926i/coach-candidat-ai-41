# Job Data Retriever

A robust web data retriever that scrapes job postings using Lightpanda CDP browser (headless) via Puppeteer. It extracts structured job data with company enrichment, normalizes the results, and outputs clean JSON.

## Features

- **Schema.org/JobPosting** extraction (JSON-LD) with DOM fallbacks
- **Company enrichment** from official websites, Wikipedia, and LinkedIn
- **Intelligent extraction** using heuristics for seniority, work model, salary, etc.
- **Data normalization** including country codes, currency codes, and skill deduplication  
- **Error resilience** with structured error handling and partial data recovery
- **Valid JSON output** always, even on errors

## Installation

```bash
# Install dependencies
npm install

# Build the retriever (optional - can run directly with tsx)
npm run retriever:build
```

## Prerequisites

**Lightpanda Browser**: You need a running Lightpanda CDP browser instance.

### Using Docker (Recommended)

```bash
# Pull and run Lightpanda browser
docker run -d --name lightpanda -p 9222:9222 \
  ghcr.io/lightpanda-io/browser:latest \
  --remote-debugging-address=0.0.0.0 \
  --remote-debugging-port=9222 \
  --headless

# Verify it's running
curl http://localhost:9222/json/version
```

### Environment Variables

```bash
# Required
export LIGHTPANDA_WS="ws://localhost:9222/devtools/browser"

# Optional
export USER_AGENT="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
export HTTP_PROXY="http://proxy:8080"
export HTTPS_PROXY="https://proxy:8080"
export TIMEOUT="30000"
```

## Usage

### Command Line

```bash
# Using environment variable
export JOB_URL="https://example.com/jobs/senior-engineer"
npm run retriever:start

# Using command line argument
npm run retriever:start -- --job-url="https://example.com/jobs/senior-engineer"

# Development mode (with tsx)
JOB_URL="https://example.com/jobs/123" npm run retriever:dev
```

### Programmatic Usage

```typescript
import { JobRetriever } from './src/retriever/index';

const retriever = new JobRetriever({
  jobUrl: 'https://example.com/jobs/senior-engineer',
  lightpandaWs: 'ws://localhost:9222/devtools/browser',
  timeout: 30000
});

const result = await retriever.retrieve();
console.log(JSON.stringify(result, null, 2));
```

## Output Format

The retriever outputs exactly one JSON object matching this structure:

```json
{
  "job": {
    "source_url": "https://example.com/jobs/123",
    "title": "Senior Software Engineer",
    "role_seniority": "senior",
    "department_function": "Engineering",
    "contract_type": "full-time",
    "work_model": "hybrid",
    "location": {
      "city": "San Francisco",
      "region": "CA", 
      "country": "US",
      "remote_policy": "hybrid"
    },
    "salary": {
      "min": 120000,
      "max": 180000,
      "currency": "USD",
      "period": "year"
    },
    "required_experience": {
      "min_years": 5,
      "max_years": 8
    },
    "required_education": "Bachelor's degree in Computer Science",
    "languages": ["English"],
    "hard_skills": ["JavaScript", "Python", "React", "Node.js"],
    "soft_skills": ["Leadership", "Communication"],
    "tech_stack": ["AWS", "Docker", "PostgreSQL"],
    "responsibilities": [
      "Lead development of web applications",
      "Mentor junior developers"
    ],
    "nice_to_have": ["GraphQL experience", "Machine learning knowledge"],
    "visa_sponsorship": true,
    "relocation": false,
    "posting_date": "2025-09-01T00:00:00.000Z",
    "application_deadline": "2025-10-01T00:00:00.000Z",
    "description_text": "We are looking for...",
    "raw_schema_org": { "@type": "JobPosting", ... },
    "detected_duplicates": []
  },
  "company": {
    "name": "TechCorp Inc",
    "aka": ["TechCorp", "TC"],
    "website": "https://techcorp.com",
    "linkedin_url": "https://linkedin.com/company/techcorp",
    "wikipedia_url": "https://en.wikipedia.org/wiki/TechCorp",
    "industry": "Technology",
    "company_type": "Private",
    "founded_year": 2010,
    "size_employees": {
      "min": 500,
      "max": 1000
    },
    "hq_location": {
      "city": "San Francisco",
      "region": "CA",
      "country": "US"
    },
    "locations": [
      {
        "city": "New York",
        "region": "NY", 
        "country": "US"
      }
    ],
    "work_culture": {
      "values": ["Innovation", "Integrity", "Excellence"],
      "benefits": ["Health insurance", "401k", "Remote work"],
      "remote_policy": "hybrid"
    },
    "funding": {
      "status": "Series C",
      "latest_round": "50M",
      "investors": ["Sequoia Capital", "Andreessen Horowitz"]
    },
    "public_ticker": "",
    "about_summary": "TechCorp is a leading technology company...",
    "data_sources": [
      "https://techcorp.com",
      "https://techcorp.com/about",
      "https://en.wikipedia.org/wiki/TechCorp"
    ]
  },
  "metadata": {
    "scraped_at": "2025-09-27T16:30:00.000Z",
    "agent": "lightpanda+puppeteer",
    "notes": []
  }
}
```

## Extraction Strategy

### 1. Job Data Extraction
- **Primary**: JSON-LD `<script type="application/ld+json">` with `@type: "JobPosting"`
- **Fallback**: DOM selectors for title, description, location, salary, etc.
- **Enrichment**: Heuristic analysis for seniority, work model, skills

### 2. Company Discovery
- Extract from `hiringOrganization` in schema.org data
- Find company links and names on job pages
- Resolve official company websites

### 3. Company Enrichment
- **Official Website**: Homepage + `/about`, `/company`, `/careers` pages
- **Wikipedia**: Only if exact, credible page exists
- **LinkedIn**: Only public, unauthenticated pages (ToS-compliant)
- **Data Sources**: Record every visited source for transparency

### 4. Normalization
- **Countries**: ISO-3166 country codes (e.g., "USA" → "US")
- **Currencies**: ISO-4217 currency codes (e.g., "$" → "USD")
- **Skills**: Deduplicate, proper capitalization (e.g., "javascript" → "JavaScript")
- **Arrays**: Remove duplicates, reasonable limits
- **Dates**: ISO format validation

## Error Handling

The retriever is designed to be resilient:

- **Partial failures**: Continue extraction even if some sources fail
- **Graceful degradation**: Return available data with error notes
- **Always valid JSON**: Even critical errors produce valid JSON output
- **Structured notes**: Error details in `metadata.notes` array

## Testing

### Smoke Tests

```bash
# Run smoke tests (requires LIGHTPANDA_WS)
npm run smoke-test

# Run basic schema validation test only
npm run smoke-test  # (without LIGHTPANDA_WS set)
```

### Manual Testing

```bash
# Test with a real job posting
export LIGHTPANDA_WS="ws://localhost:9222/devtools/browser"
export JOB_URL="https://jobs.lever.co/example/senior-engineer"
npm run retriever:dev
```

## Performance & Limits

- **Timeout**: 30 seconds default (configurable)
- **Skills limit**: 30 per category to avoid bloat
- **Text limits**: 1000 characters for descriptions
- **Concurrent requests**: Sequential to respect rate limits
- **Cookie handling**: Automatic dismissal of common cookie banners

## Compliance & Ethics

- **Robots.txt**: Respects robots.txt where possible
- **Rate limiting**: Polite crawling with delays between requests  
- **ToS compliance**: Only scrapes publicly accessible content
- **LinkedIn**: Only accesses public, unauthenticated company pages
- **User-Agent**: Identifies itself properly in requests

## Architecture

```
src/retriever/
├── index.ts          # Main orchestrator and CLI
├── browser.ts        # Lightpanda CDP connection & management
├── extractJob.ts     # Job data extraction (JSON-LD + DOM)
├── enrichCompany.ts  # Company data enrichment
├── normalize.ts      # Data normalization and validation
└── schema.ts         # Zod schemas and TypeScript types

scripts/
└── smoke.ts          # Test harness for validation
```

## Troubleshooting

### Common Issues

1. **"LIGHTPANDA_WS environment variable is required"**
   ```bash
   # Make sure Lightpanda is running
   docker ps | grep lightpanda
   
   # Set the WebSocket endpoint
   export LIGHTPANDA_WS="ws://localhost:9222/devtools/browser"
   ```

2. **Connection timeouts**
   ```bash
   # Increase timeout
   export TIMEOUT="60000"  # 60 seconds
   
   # Check if Lightpanda is responsive
   curl http://localhost:9222/json/version
   ```

3. **Empty results**
   - Check if the job posting URL is accessible
   - Some sites may block automated browsers
   - Try with different job board URLs

4. **Missing company data**
   - Company enrichment is best-effort
   - Some companies may not have Wikipedia pages
   - LinkedIn scraping only works for public pages

### Debug Mode

```bash
# Enable verbose logging (if implemented)
DEBUG=1 npm run retriever:dev
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/improvement`
3. Make changes and add tests
4. Run smoke tests: `npm run smoke-test`
5. Submit a pull request

## License

[Add your license here]
