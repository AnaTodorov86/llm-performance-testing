/**
 * lib/slo.js
 * 
 * SLO/SLI definitions - Service Level Objectives and Indicators.
 * Uses environment-aware thresholds from environments.js.
 */

import { getThresholds } from './environments.js';

const thresholds = getThresholds();

export const SLO_DEFINITIONS = {
    performance: {
        name: 'LLM API Performance',
        slis: [
            { name: 'availability', description: 'API responds successfully', target: thresholds.successRate, isHigherBetter: true },
            { name: 'latency_p95', description: '95th percentile response time', target: thresholds.p95Latency, unit: 'ms', isHigherBetter: false },
            { name: 'latency_p99', description: '99th percentile response time', target: thresholds.p95Latency * 2, unit: 'ms', isHigherBetter: false },
        ],
        errorBudget: 0.05,
    },
    quality: {
        name: 'Response Quality',
        slis: [
            { name: 'accuracy', description: 'Correct answers', target: 0.90, isHigherBetter: true },
            { name: 'instruction_following', description: 'Follows length instructions', target: 0.95, isHigherBetter: true },
            { name: 'hallucination_rate', description: 'False answers', target: 0.05, isHigherBetter: false },
        ],
        errorBudget: 0.10,
    },
    consistency: {
        name: 'Response Consistency',
        slis: [
            { name: 'consistency_rate', description: 'Same prompt = same answer', target: 0.95, isHigherBetter: true },
            { name: 'drift_rate', description: 'Answer changes over time', target: 0.05, isHigherBetter: false },
        ],
        errorBudget: 0.05,
    },
    reliability: {
        name: 'System Reliability',
        slis: [
            { name: 'circuit_breaker_health', description: 'Circuit breaker closed', target: 0.99, isHigherBetter: true },
            { name: 'rate_limit_handling', description: 'Proper rate limit handling', target: 1.0, isHigherBetter: true },
        ],
        errorBudget: 0.01,
    },
};

export const evaluateSLO = (metrics, sloType) => {
    const slo = SLO_DEFINITIONS[sloType];
    if (!slo) {
        return null;
    }

    const results = slo.slis.map(sli => {
        const actual = metrics[sli.name] || 0;
        const passed = sli.isHigherBetter 
            ? actual >= sli.target 
            : actual <= sli.target;
        return { ...sli, actual, passed };
    });

    const allPassed = results.every(r => r.passed);
    const errorBudgetUsed = 1 - (results.reduce((acc, r) => acc + (r.passed ? 1 : 0), 0) / results.length);

    return {
        slo: slo.name,
        passed: allPassed,
        errorBudgetRemaining: (slo.errorBudget - errorBudgetUsed).toFixed(2),
        results,
    };
};
