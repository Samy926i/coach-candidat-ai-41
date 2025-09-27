#!/bin/bash

# Job Data Retriever - Lightpanda Cloud Example Usage
# This script demonstrates how to use the job data retriever with Lightpanda Cloud API

set -e  # Exit on error

echo "🚀 Job Data Retriever - Lightpanda Cloud"
echo "========================================"

# Check if LIGHTPANDA_TOKEN is set
if [ -z "$LIGHTPANDA_TOKEN" ] && [ -z "$LIGHTPANDA_API_KEY" ]; then
    echo "❌ LIGHTPANDA_TOKEN (or LIGHTPANDA_API_KEY) environment variable is required"
    echo ""
    echo "To get your token:"
    echo "  1. Visit: https://lightpanda.io/#cloud-offer"
    echo "  2. Sign up for an account"
    echo "  3. Get your token from the dashboard"
    echo ""
    echo "Then set the environment variable:"
    echo "  export LIGHTPANDA_TOKEN='your-token-here'"
    echo "  # or export LIGHTPANDA_API_KEY='your-token-here' (legacy)"
    echo ""
    echo "🌐 Lightpanda Cloud uses CDP WebSocket endpoint:"
    echo "   wss://cloud.lightpanda.io/ws?token=YOUR_TOKEN"
    echo ""
    echo "💡 Lightpanda Cloud offers a free tier to get started!"
    exit 1
fi

echo "✅ Using Lightpanda Cloud CDP endpoint"

# Test with environment variable
echo ""
echo "📝 Example 1: Using environment variable"
echo "export JOB_URL='https://jobs.lever.co/stripe/software-engineer'"
echo "npm run retriever-cloud:start"

# Test with command line argument
echo ""
echo "📝 Example 2: Using command line argument with proxy"
echo "export LIGHTPANDA_PROXY='datacenter'"
echo "export LIGHTPANDA_COUNTRY='us'"
echo "npm run retriever-cloud:start -- --job-url='https://boards.greenhouse.io/stripe/jobs/123'"

# Development mode
echo ""
echo "📝 Example 3: Development mode (faster iteration)"
echo "JOB_URL='https://remote.co/job/123' npm run retriever-cloud:dev"

echo ""
echo "📚 For more examples, see README-retriever-cloud.md"
echo ""

# Check if a job URL was provided as argument
if [ $# -eq 0 ]; then
    echo "💡 Tip: You can pass a job URL as an argument to test now:"
    echo "  $0 'https://example.com/jobs/123'"
    exit 0
fi

JOB_URL="$1"
echo "🔍 Testing with URL: $JOB_URL"
echo ""

# Run the retriever
echo "🏃 Running Lightpanda Cloud retriever..."
if JOB_URL="$JOB_URL" npm run retriever-cloud:dev; then
    echo ""
    echo "✅ Success! Job data extracted and validated using Lightpanda Cloud."
else
    echo ""
    echo "❌ Extraction failed, but should have returned valid JSON with error notes."
fi
