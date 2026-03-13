/**
 * lib/sloReporter.js
 * 
 * SLO evaluation and reporting - integrates with testBase.js
 * Uses k6 native metrics when available for accuracy.
 */

import { SLO_DEFINITIONS, evaluateSLO } from './slo.js';
import { logger } from './logger.js';

let testMetrics = {
    availability: 0,
    totalRequests: 0,
    successfulRequests: 0,
    latencyP95: 0,
    latencyP99: 0,
    qualityFailures: 0,
    hallucinations: 0,
    inconsistencies: 0,
    circuitBreakerOpens: 0,
};

export const resetSloMetrics = () => {
    testMetrics = {
        availability: 0,
        totalRequests: 0,
        successfulRequests: 0,
        latencyP95: 0,
        latencyP99: 0,
        qualityFailures: 0,
        hallucinations: 0,
        inconsistencies: 0,
        circuitBreakerOpens: 0,
    };
};

export const recordRequest = (success, duration) => {
    testMetrics.totalRequests++;
    if (success) {
        testMetrics.successfulRequests++;
    }
    if (testMetrics.totalRequests > 0) {
        testMetrics.availability = testMetrics.successfulRequests / testMetrics.totalRequests;
    }
};

export const recordQualityFailure = () => {
    testMetrics.qualityFailures++;
};

export const recordHallucination = () => {
    testMetrics.hallucinations++;
};

export const recordInconsistency = () => {
    testMetrics.inconsistencies++;
};

export const recordCircuitBreakerOpen = () => {
    testMetrics.circuitBreakerOpens++;
};

export const setLatencyMetrics = (p95, p99) => {
    testMetrics.latencyP95 = p95;
    testMetrics.latencyP99 = p99;
};

export const syncK6Metrics = (k6Metrics) => {
    if (k6Metrics && k6Metrics.successRate !== undefined) {
        testMetrics.availability = k6Metrics.successRate;
    }
    if (k6Metrics && k6Metrics.totalRequests !== undefined) {
        testMetrics.totalRequests = k6Metrics.totalRequests;
    }
    if (k6Metrics && k6Metrics.latencyP95 !== undefined) {
        testMetrics.latencyP95 = k6Metrics.latencyP95;
    }
    if (k6Metrics && k6Metrics.latencyP99 !== undefined) {
        testMetrics.latencyP99 = k6Metrics.latencyP99;
    }
};

export const evaluatePerformanceSLO = () => {
    const metrics = {
        availability: testMetrics.availability,
        latency_p95: testMetrics.latencyP95,
        latency_p99: testMetrics.latencyP99,
    };
    return evaluateSLO(metrics, 'performance');
};

export const evaluateQualitySLO = () => {
    const total = testMetrics.qualityFailures + testMetrics.hallucinations;
    const accuracy = total > 0 ? 1 - (testMetrics.qualityFailures / total) : 1;
    const hallucination_rate = testMetrics.totalRequests > 0 
        ? testMetrics.hallucinations / testMetrics.totalRequests 
        : 0;
    
    const metrics = {
        accuracy,
        hallucination_rate,
    };
    return evaluateSLO(metrics, 'quality');
};

export const evaluateConsistencySLO = () => {
    const consistency_rate = testMetrics.totalRequests > 0
        ? 1 - (testMetrics.inconsistencies / testMetrics.totalRequests)
        : 1;
    
    const metrics = {
        consistency_rate,
        drift_rate: testMetrics.inconsistencies / testMetrics.totalRequests,
    };
    return evaluateSLO(metrics, 'consistency');
};

export const evaluateReliabilitySLO = () => {
    const circuit_breaker_health = testMetrics.totalRequests > 0
        ? 1 - (testMetrics.circuitBreakerOpens / testMetrics.totalRequests)
        : 1;
    
    const metrics = {
        circuit_breaker_health,
    };
    return evaluateSLO(metrics, 'reliability');
};

export const reportSLOs = (testType) => {
    let result;
    
    switch (testType) {
        case 'performance':
        case 'baseline':
        case 'load':
        case 'stress':
            result = evaluatePerformanceSLO();
            break;
        case 'quality':
            result = evaluateQualitySLO();
            break;
        case 'consistency':
            result = evaluateConsistencySLO();
            break;
        default:
            result = evaluatePerformanceSLO();
    }
    
    if (result) {
        logger.info('SLO Evaluation', {
            slo: result.slo,
            passed: result.passed,
            errorBudgetRemaining: result.errorBudgetRemaining,
            results: result.results,
        });
    }
    
    return result;
};
