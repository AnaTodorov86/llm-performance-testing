/**
 * tests/performance_test.js
 * Baseline / Load / Stress scenarios - KISS + DRY.
 */

import { STAGES_BASELINE, STAGES_LOAD, STAGES_STRESS, THRESHOLDS_DEFAULT, THRESHOLDS_STRESS } from '../lib/config.js';
import { llmLatency, llmErrors, llmSuccess, llmRateLimits } from '../lib/metrics.js';
import { askLLM } from '../lib/helpers.js';
import { PERFORMANCE_PROMPTS } from '../lib/prompts.js';
import { analyzeFailure } from '../lib/analyzer.js';
import { getProvider } from '../lib/providers.js';
import { setupTest, logResult, check, sleep, recordRequest, evaluateSLOs, recordTestResult, recordThresholdFailure, hasThresholdFailures, validateTestResult, syncK6Metrics } from '../lib/testBase.js';

const SCENARIO = (__ENV.TEST_SCENARIO || 'baseline').toLowerCase();
const STAGES = { baseline: STAGES_BASELINE, load: STAGES_LOAD, stress: STAGES_STRESS };
const THRESHOLDS = { baseline: THRESHOLDS_DEFAULT, load: THRESHOLDS_DEFAULT, stress: THRESHOLDS_STRESS };

if (!STAGES[SCENARIO]) throw new Error(`Unknown TEST_SCENARIO: "${SCENARIO}"`);

export const options = { 
    stages: STAGES[SCENARIO], 
    thresholds: THRESHOLDS[SCENARIO],
};

setupTest('performance', null, { validate: false });

const provider = getProvider();

export default function () {
    const prompt = PERFORMANCE_PROMPTS[Math.floor(Math.random() * PERFORMANCE_PROMPTS.length)];
    const { answer, status, duration, correlationId } = askLLM(prompt, 10, 0);

    llmLatency.add(duration);
    recordRequest(status === 200, duration);

    if (status === 429) {
        llmRateLimits.add(1);
    } else if (status === 200) {
        llmErrors.add(0);
        llmSuccess.add(1);
        logResult('request', 'success', { correlationId, duration, promptLength: prompt.length });
    } else {
        llmErrors.add(1);
        llmSuccess.add(0);
        logResult('request', 'error', { correlationId, status });
        analyzeFailure({ prompt, expected: 'HTTP 200', got: `HTTP ${status}`, type: `performance-${SCENARIO}`, provider: provider.name });
    }

    const passed = status === 200 && answer !== null;
    recordTestResult('performance_request', passed);

    check(answer, {
        'status is 200': () => status === 200,
        'response has content': () => answer !== null,
        'response time OK': () => duration < (SCENARIO === 'stress' ? 5000 : 2000),
    });

    sleep(SCENARIO === 'stress' ? 0.5 : 1);
}

export function handleSummary(data) {
    const metricsData = extractMetrics(data);
    
    syncK6Metrics({
        successRate: metricsData.success,
        totalRequests: data.metrics?.llm_latency?.values?.count || 0,
        latencyP95: metricsData.latency?.p95 || 0,
        latencyP99: metricsData.latency?.p99 || 0,
    });
    
    const validation = validateTestResult(SCENARIO, metricsData);
    const sloResult = evaluateSLOs(SCENARIO);
    
    return {
        'stdout': textSummary(data, sloResult, validation),
    };
}

function extractMetrics(data) {
    if (!data || !data.metrics) return {};
    
    return {
        latency: {
            avg: data.metrics.llm_latency?.values?.avg || 0,
            p95: data.metrics.llm_latency?.values?.['p(95)'] || 0,
            p99: data.metrics.llm_latency?.values?.['p(99)'] || 0,
            max: data.metrics.llm_latency?.values?.max || 0,
        },
        success: data.metrics.llm_success?.values?.rate || 0,
        errors: data.metrics.llm_errors?.values?.rate || 0,
    };
}

function textSummary(data, sloResult, validation) {
    if (!data) return 'No data available';
    
    let output = `\n=== Performance Test Summary (${SCENARIO}) ===\n\n`;
    
    if (data.metrics?.llm_latency?.values) {
        output += `Latency:\n`;
        output += `  avg: ${data.metrics.llm_latency.values.avg?.toFixed(2) || 0}ms\n`;
        output += `  p95: ${data.metrics.llm_latency.values['p(95)']?.toFixed(2) || 0}ms\n`;
        output += `  max: ${data.metrics.llm_latency.values.max?.toFixed(2) || 0}ms\n\n`;
    }
    
    if (data.metrics?.llm_success?.values) {
        output += `Success Rate: ${(data.metrics.llm_success.values.rate * 100).toFixed(2)}%\n`;
    }
    
    if (data.metrics?.llm_errors?.values) {
        output += `Error Rate: ${(data.metrics.llm_errors.values.rate * 100).toFixed(2)}%\n`;
    }
    
    if (sloResult) {
        output += `\nSLO Status: ${sloResult.passed ? '✅ PASSED' : '❌ FAILED'}\n`;
        output += `Error Budget Remaining: ${sloResult.errorBudgetRemaining}%\n`;
    }
    
    if (validation && !validation.passed) {
        output += `\n❌ TEST VALIDATION FAILED:\n`;
        validation.errors.forEach(e => output += `  - ${e}\n`);
    } else {
        output += `\n✅ TEST VALIDATION PASSED\n`;
    }
    
    return output;
}
