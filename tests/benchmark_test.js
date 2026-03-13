/**
 * tests/benchmark_test.js - KISS + DRY.
 */

import { Trend, Rate } from 'k6/metrics';
import { getProvider } from '../lib/providers.js';
import { askLLM, isCorrectAnswer, followsLengthInstruction } from '../lib/helpers.js';
import { QUALITY_CHECKS } from '../lib/prompts.js';
import { analyzeFailure } from '../lib/analyzer.js';
import { setupTest, logResult, check, sleep, recordRequest, recordQualityFailure, evaluateSLOs, recordTestResult, validateTestResult } from '../lib/testBase.js';

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

    if (status === 429 || answer === null) {
        errorRate.add(1);
        sleep(2);
        return;
    }

    recordRequest(status === 200, duration);

    const correct = isCorrectAnswer(answer, testCase.expected);
    const formatOk = followsLengthInstruction(answer);

    latency.add(duration);
    errorRate.add(0);
    correctRate.add(correct ? 1 : 0);
    formatRate.add(formatOk ? 1 : 0);

    if (!correct) {
        recordQualityFailure();
        
        logResult('benchmark', 'incorrect', { correlationId, expected: testCase.expected, got: answer, duration });
        analyzeFailure({ prompt: testCase.prompt, expected: testCase.expected, got: answer, type: testCase.type, provider: provider.name });
        
        recordTestResult('benchmark_test', false);
    } else {
        logResult('benchmark', 'pass', { correlationId, duration });
        
        recordTestResult('benchmark_test', true);
    }

    check(answer, {
        'answer is correct': a => isCorrectAnswer(a, testCase.expected),
        'answer follows format': a => followsLengthInstruction(a),
    });

    sleep(1);
}

export function handleSummary(data) {
    const metricsData = extractMetrics(data);
    const validation = validateTestResult('performance', metricsData);
    const sloResult = evaluateSLOs('benchmark');
    
    return {
        'stdout': textSummary(data, sloResult, validation),
    };
}

function extractMetrics(data) {
    if (!data || !data.metrics) {
        return {};
    }
    
    const latKey = `bench_${pName}_latency`;
    return {
        latency: {
            avg: data.metrics[latKey]?.values?.avg || 0,
            p95: data.metrics[latKey]?.values?.['p(95)'] || 0,
            p99: data.metrics[latKey]?.values?.['p(99)'] || 0,
            max: data.metrics[latKey]?.values?.max || 0,
        },
    };
}

function textSummary(data, sloResult, validation) {
    if (!data) {
        return 'No data available';
    }
    
    let output = `\n=== Benchmark Test Summary (${pName}) ===\n\n`;
    
    const latKey = `bench_${pName}_latency`;
    if (data.metrics?.[latKey]?.values) {
        output += `Latency:\n`;
        output += `  avg: ${data.metrics[latKey].values.avg?.toFixed(2) || 0}ms\n`;
        output += `  p95: ${data.metrics[latKey].values['p(95)']?.toFixed(2) || 0}ms\n\n`;
    }
    
    const correctKey = `bench_${pName}_correct`;
    if (data.metrics?.[correctKey]?.values) {
        output += `Correct Rate: ${(data.metrics[correctKey].values.rate * 100).toFixed(2)}%\n`;
    }
    
    if (sloResult) {
        output += `\nSLO Status: ${sloResult.passed ? '✅ PASSED' : '❌ FAILED'}\n`;
    }
    
    if (validation && !validation.passed) {
        output += `\n❌ TEST VALIDATION FAILED:\n`;
        validation.errors.forEach(e => output += `  - ${e}\n`);
    } else {
        output += `\n✅ TEST VALIDATION PASSED\n`;
    }
    
    return output;
}
