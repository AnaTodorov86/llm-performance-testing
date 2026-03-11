/**
 * tests/benchmark_test.js
 *
 * Runs the same prompts against multiple providers and compares:
 *   - latency (p50, p95)
 *   - error rate
 *   - hallucination rate
 *   - instruction-following rate
 *
 * Each provider gets its own set of k6 metrics so results are
 * visible separately in the summary output.
 *
 * Usage:
 *   # Run against Groq (default)
 *   k6 run --env GROQ_API_KEY=$KEY tests/benchmark_test.js
 *
 *   # Run against local Ollama
 *   k6 run --env PROVIDER=ollama tests/benchmark_test.js
 *
 *   # Compare both — run twice and diff the summary JSONs
 *   k6 run --env PROVIDER=groq   --out json=reports/bench_groq.json   tests/benchmark_test.js
 *   k6 run --env PROVIDER=ollama --out json=reports/bench_ollama.json tests/benchmark_test.js
 */

import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

import { getProvider }                              from '../lib/providers.js';
import { askLLM, isCorrectAnswer, followsLengthInstruction } from '../lib/helpers.js';
import { QUALITY_CHECKS }                           from '../lib/prompts.js';

// ---------------------------------------------------------------------------
// Resolve provider once at init time
// ---------------------------------------------------------------------------

const provider = getProvider();
const pName    = provider.name.toLowerCase();  // e.g. 'groq' or 'ollama'

// ---------------------------------------------------------------------------
// Per-provider metrics
// Naming pattern: bench_<provider>_<metric>
// This means Groq and Ollama results are always visible separately,
// even if you later run them in the same k6 scenario.
// ---------------------------------------------------------------------------

const latency      = new Trend(`bench_${pName}_latency`);
const errorRate    = new Rate(`bench_${pName}_errors`);
const correctRate  = new Rate(`bench_${pName}_correct`);
const formatRate   = new Rate(`bench_${pName}_format_ok`);

// ---------------------------------------------------------------------------
// k6 options
// ---------------------------------------------------------------------------

export const options = {
    vus:        2,
    iterations: 20,
    thresholds: {
        [`bench_${pName}_errors`]:    ['rate<0.1'],
        [`bench_${pName}_correct`]:   ['rate>0.8'],
        [`bench_${pName}_format_ok`]: ['rate>0.8'],
        [`bench_${pName}_latency`]:   ['p(95)<5000'],
    },
};

// ---------------------------------------------------------------------------
// Test logic
// ---------------------------------------------------------------------------

export default function () {
    const testCase = QUALITY_CHECKS[Math.floor(Math.random() * QUALITY_CHECKS.length)];
    const { answer, status, duration } = askLLM(testCase.prompt, 20, 0, provider);

    if (status === 429 || answer === null) {
        errorRate.add(1);
        sleep(2);
        return;
    }

    const correct    = isCorrectAnswer(answer, testCase.expected);
    const formatOk   = followsLengthInstruction(answer);

    latency.add(duration);
    errorRate.add(0);
    correctRate.add(correct ? 1 : 0);
    formatRate.add(formatOk ? 1 : 0);

    if (!correct) {
        console.log(`❌ [${provider.name}][${testCase.type}] Expected: "${testCase.expected}" | Got: "${answer}"`);
    } else {
        console.log(`✅ [${provider.name}][${duration}ms] "${answer}"`);
    }

    check(answer, {
        'answer is correct':         (a) => isCorrectAnswer(a, testCase.expected),
        'answer follows format':     (a) => followsLengthInstruction(a),
    });

    sleep(1);
}