#!/bin/bash

set -a
source .env
set +a

TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
REPORT_DIR="reports/$TIMESTAMP"
mkdir -p $REPORT_DIR

echo "📊 Generating reports..."

k6 run --env GROQ_API_KEY=$GROQ_API_KEY \
  --out json=$REPORT_DIR/baseline.json \
  tests/baseline_test.js

k6 run --env GROQ_API_KEY=$GROQ_API_KEY \
  --out json=$REPORT_DIR/quality.json \
  tests/quality_test.js

k6 run --env GROQ_API_KEY=$GROQ_API_KEY \
  --out json=$REPORT_DIR/consistency.json \
  tests/consistency_test.js

echo "✅ Reports saved to $REPORT_DIR"