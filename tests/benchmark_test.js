/**
 * tests/benchmark_test.js - KISS + DRY.
 */

import { Trend, Rate } from 'k6/metrics';
import { getProvider } from '../lib/providers.js';
import { askLLM, isCorrectAnswer, followsLengthInstruction } from '../lib/helpers.js';
import { QUALITY_CHECKS } from '../lib/prompts.js';
import { analyzeFailure } from '../lib/analyzer.js';
import { setupTest, logResult, check, sleep } from '../lib/testBase.js';

const provider = getProvider();
const pName = provider.name.toLowerCase();

export const options = {
    vus: 2,
    iterations: 20,
    thresholds: {
        [`bench_${pName}_errors`]: ['rate<0.1'],
        [`bench_${pName}_correct`]: ['rate>0.8'],
        [`bench_${pName}_format_ok`]: ['rate>0.8'],
        [`bench_${pName}_latency`]: ['p(95)<5000'],
    },
};

const latency = new Trend(`bench_${pName}_latency`);
const errorRate = new Rate(`bench_${pName}_errors`);
const correctRate = new Rate(`bench_${pName}_correct`);
const formatRate = new Rate(`bench_${pName}_format_ok`);

setupTest('benchmark', QUALITY_CHECKS);

export default function () {
    const testCase = QUALITY_CHECKS[Math.floor(Math.random() * QUALITY_CHECKS.length)];
    const { answer, status, duration, correlationId } = askLLM(testCase.prompt, 20, 0, provider);

    if (status === 429 || answer === null) { errorRate.add(1); sleep(2); return; }

    const correct = isCorrectAnswer(answer, testCase.expected);
    const formatOk = followsLengthInstruction(answer);

    latency.add(duration);
    errorRate.add(0);
    correctRate.add(correct ? 1 : 0);
    formatRate.add(formatOk ? 1 : 0);

    if (!correct) {
        logResult('benchmark', 'incorrect', { correlationId, expected: testCase.expected, got: answer, duration });
        analyzeFailure({ prompt: testCase.prompt, expected: testCase.expected, got: answer, type: testCase.type, provider: provider.name });
    } else {
        logResult('benchmark', 'pass', { correlationId, duration });
    }

    check(answer, {
        'answer is correct': a => isCorrectAnswer(a, testCase.expected),
        'answer follows format': a => followsLengthInstruction(a),
    });

    sleep(1);
}
