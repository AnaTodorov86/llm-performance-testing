#!/bin/bash
# scripts/generate_report.sh

set -euo pipefail

set -a; source .env; set +a

TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
REPORT_DIR="reports/$TIMESTAMP"
mkdir -p "$REPORT_DIR"

echo "📊 Generating report → $REPORT_DIR"

k6 run --env GROQ_API_KEY=$GROQ_API_KEY \
       --env TEST_SCENARIO=baseline \
       --out json="$REPORT_DIR/baseline.json" \
       tests/performance_test.js

k6 run --env GROQ_API_KEY=$GROQ_API_KEY \
       --env TEST_SCENARIO=load \
       --out json="$REPORT_DIR/load.json" \
       tests/performance_test.js

k6 run --env GROQ_API_KEY=$GROQ_API_KEY \
       --env TEST_SCENARIO=stress \
       --out json="$REPORT_DIR/stress.json" \
       tests/performance_test.js

k6 run --env GROQ_API_KEY=$GROQ_API_KEY \
       --out json="$REPORT_DIR/quality.json" \
       tests/quality_test.js

k6 run --env GROQ_API_KEY=$GROQ_API_KEY \
       --out json="$REPORT_DIR/consistency.json" \
       tests/consistency_test.js

echo "✅ Report saved in  $REPORT_DIR"