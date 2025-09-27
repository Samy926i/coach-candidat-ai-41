#!/bin/bash

# Job Data Retriever - Example Usage
# This script demonstrates how to use the job data retriever

set -e  # Exit on error

echo "🚀 Job Data Retriever - Example Usage"
echo "====================================="

# Check if LIGHTPANDA_WS is set
if [ -z "$LIGHTPANDA_WS" ]; then
    echo "❌ LIGHTPANDA_WS environment variable is required"
    echo ""
    echo "To start Lightpanda browser with Docker:"
    echo "  npm run lightpanda:up"
    echo ""
    echo "Then set the environment variable:"
    echo "  export LIGHTPANDA_WS='ws://localhost:9222/devtools/browser'"
    echo ""
    echo "Or start Lightpanda manually:"
    echo "  docker run -d --name lightpanda -p 9222:9222 \\"
    echo "    ghcr.io/lightpanda-io/browser:latest \\"
    echo "    --remote-debugging-address=0.0.0.0 \\"
    echo "    --remote-debugging-port=9222 \\"
    echo "    --headless"
    exit 1
fi

echo "✅ Using Lightpanda at: $LIGHTPANDA_WS"

# Test with environment variable
echo ""
echo "📝 Example 1: Using environment variable"
echo "export JOB_URL='https://jobs.lever.co/example/senior-engineer'"
echo "npm run retriever:start"

# Test with command line argument
echo ""
echo "📝 Example 2: Using command line argument"
echo "npm run retriever:start -- --job-url='https://stackoverflow.com/jobs/123'"

# Development mode
echo ""
echo "📝 Example 3: Development mode (faster iteration)"
echo "JOB_URL='https://remote.co/job/123' npm run retriever:dev"

echo ""
echo "📚 For more examples, see README-retriever.md"
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
echo "🏃 Running retriever..."
if JOB_URL="$JOB_URL" npm run retriever:dev; then
    echo ""
    echo "✅ Success! Job data extracted and validated."
else
    echo ""
    echo "❌ Extraction failed, but should have returned valid JSON with error notes."
fi
