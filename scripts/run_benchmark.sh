#!/bin/bash
# scripts/run_benchmark.sh
#
# Runs benchmark_test.js against all available providers and saves
# results to reports/benchmark_<timestamp>/
#
# Prerequisites:
#   - GROQ_API_KEY set in .env
#   - Ollama running locally: ollama serve (optional)
#
# Usage:
#   ./scripts/run_benchmark.sh            # Groq only
#   ./scripts/run_benchmark.sh --all      # Groq + Ollama

set -euo pipefail

# Works regardless of where the script is called from
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

set -a; source .env; set +a

TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
REPORT_DIR="reports/benchmark_${TIMESTAMP}"
mkdir -p "$REPORT_DIR"

RUN_ALL=${1:-""}

echo "🔬 LLM Provider Benchmark"
echo "========================="
echo "📁 Results → $REPORT_DIR"
echo ""

# ── Groq ────────────────────────────────────────────────────────────────────
echo "▶ Running: Groq (llama-3.1-8b-instant)..."
k6 run \
  --env GROQ_API_KEY="$GROQ_API_KEY" \
  --env PROVIDER=groq \
  --out json="$REPORT_DIR/groq.json" \
  --summary-export="$REPORT_DIR/groq_summary.json" \
  tests/benchmark_test.js

echo ""

# ── Ollama (optional) ────────────────────────────────────────────────────────
if [[ "$RUN_ALL" == "--all" ]]; then
  echo "▶ Running: Ollama (local)..."
  k6 run \
    --env PROVIDER=ollama \
    --out json="$REPORT_DIR/ollama.json" \
    --summary-export="$REPORT_DIR/ollama_summary.json" \
    tests/benchmark_test.js
  echo ""
fi

# ── Print comparison ─────────────────────────────────────────────────────────
echo "✅ Benchmark complete."
echo ""
echo "📊 Quick comparison (from summary JSON):"
echo ""

for summary in "$REPORT_DIR"/*_summary.json; do
  provider=$(basename "$summary" _summary.json)
  echo "── $provider ──"
  # Extract key metrics using node (available wherever k6 is installed)
  node -e "
    const s = require('$summary');
    const m = s.metrics;
    const p = '$provider';
    const lat = m['bench_' + p + '_latency'];
    const cor = m['bench_' + p + '_correct'];
    const err = m['bench_' + p + '_errors'];
    if (lat) console.log('  latency p95 : ' + lat.values['p(95)'].toFixed(0) + 'ms');
    if (cor) console.log('  correct rate: ' + (cor.values.rate * 100).toFixed(1) + '%');
    if (err) console.log('  error rate  : ' + (err.values.rate * 100).toFixed(1) + '%');
  " 2>/dev/null || echo "  (install node to see inline summary)"
  echo ""
done

echo "Full results saved to: $REPORT_DIR"