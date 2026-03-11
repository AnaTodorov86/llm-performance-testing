#!/bin/bash
# scripts/run_all_tests.sh

set -euo pipefail

set -a; source "$(dirname "$0")/../.env" set +a

echo "🚀 LLM Performance & Quality Test Suite"
echo "========================================"

echo ""
echo "📊 Baseline (1–5 VUs)..."
k6 run --env GROQ_API_KEY=$GROQ_API_KEY \
       --env TEST_SCENARIO=baseline \
       tests/performance_test.js

echo ""
echo "📊 Load (5–20 VUs)..."
k6 run --env GROQ_API_KEY=$GROQ_API_KEY \
       --env TEST_SCENARIO=load \
       tests/performance_test.js

echo ""
echo "📊 Stress (10–60 VUs)..."
k6 run --env GROQ_API_KEY=$GROQ_API_KEY \
       --env TEST_SCENARIO=stress \
       tests/performance_test.js

echo ""
echo "🧠 Quality test..."
k6 run --env GROQ_API_KEY=$GROQ_API_KEY \
       tests/quality_test.js

echo ""
echo "🔄 Consistency test..."
k6 run --env GROQ_API_KEY=$GROQ_API_KEY \
       tests/consistency_test.js

echo ""
echo "✅ All test executed"