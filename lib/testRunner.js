/**
 * lib/testRunner.js
 * 
 * Test runner with SLO enforcement and threshold handling.
 * Following Google SDET best practices.
 */

import { logger } from './logger.js';
import { evaluatePerformanceSLO, evaluateQualitySLO, evaluateConsistencySLO, setLatencyMetrics } from './sloReporter.js';

let sloEnforcementEnabled = true;
let thresholdFailures = [];

export const setSloEnforcement = (enabled) => {
    sloEnforcementEnabled = enabled;
};

export const recordThresholdFailure = (metric, message) => {
    thresholdFailures.push({ metric, message, timestamp: Date.now() });
    logger.warn('Threshold crossed', { metric, message });
};

export const getThresholdFailures = () => thresholdFailures;

export const hasThresholdFailures = () => thresholdFailures.length > 0;

export const resetThresholdFailures = () => {
    thresholdFailures = [];
};

export const evaluateTestSLO = (testType, metricsData) => {
    let result;
    
    switch (testType) {
        case 'performance':
        case 'baseline':
        case 'load':
        case 'stress':
            if (metricsData?.latency) {
                setLatencyMetrics(
                    metricsData.latency.p95 || 0,
                    metricsData.latency.p99 || 0
                );
            }
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
    
    return result;
};

export const validateTestResult = (testType, metricsData) => {
    const errors = [];
    const warnings = [];
    
    const sloResult = evaluateTestSLO(testType, metricsData);
    
    if (sloEnforcementEnabled && sloResult && !sloResult.passed) {
        errors.push(`SLO failed: ${sloResult.slo}`);
        sloResult.results.forEach(r => {
            if (!r.passed) {
                errors.push(`  - ${r.name}: actual=${r.actual}, target=${r.target}`);
            }
        });
    }
    
    if (hasThresholdFailures()) {
        thresholdFailures.forEach(f => {
            errors.push(`Threshold failed: ${f.metric} - ${f.message}`);
        });
    }
    
    if (errors.length > 0) {
        logger.error('Test validation failed', { errors, warnings });
    } else {
        logger.info('Test validation passed', { 
            sloPassed: sloResult?.passed,
            sloBudget: sloResult?.errorBudgetRemaining 
        });
    }
    
    return {
        passed: errors.length === 0,
        errors,
        warnings,
        sloResult,
    };
};
