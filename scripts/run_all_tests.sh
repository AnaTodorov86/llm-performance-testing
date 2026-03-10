#!/bin/bash

echo "🚀 Starting LLM Performance & Quality Test Suite"
echo "================================================="

# učitaj API key iz .env
set -a
source .env
set +a

echo ""
echo "📊 Running Baseline Test (5 VUs)..."
k6 run --env GROQ_API_KEY=$GROQ_API_KEY tests/baseline_test.js

echo ""
echo "📊 Running Load Test (20 VUs)..."
k6 run --env GROQ_API_KEY=$GROQ_API_KEY tests/load_test.js

echo ""
echo "📊 Running Stress Test (60 VUs)..."
k6 run --env GROQ_API_KEY=$GROQ_API_KEY tests/stress_test.js

echo ""
echo "🧠 Running Quality Test..."
k6 run --env GROQ_API_KEY=$GROQ_API_KEY tests/quality_test.js

echo ""
echo "🔄 Running Consistency Test..."
k6 run --env GROQ_API_KEY=$GROQ_API_KEY tests/consistency_test.js

echo ""
echo "✅ All tests completed!"