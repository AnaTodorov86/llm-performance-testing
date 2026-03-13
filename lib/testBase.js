/**
 * lib/testBase.js
 * 
 * Common test utilities - DRY principle.
 * Single source of truth for test patterns.
 * Includes SLO evaluation, secret rotation, flaky detection, and test runner.
 */

import { check, sleep } from 'k6';
import { initLogger, logger, createCorrelationId } from './logger.js';
import { validateTestData } from './validator.js';
import { initSecretRotation, getSecretRotation } from './secretRotation.js';
import { flakyDetector } from './flakyDetector.js';
import { 
    resetSloMetrics, 
    recordRequest, 
    recordQualityFailure, 
    recordHallucination, 
    recordInconsistency, 
    reportSLOs,
    syncK6Metrics,
} from './sloReporter.js';
import {
    setSloEnforcement,
    recordThresholdFailure,
    getThresholdFailures,
    hasThresholdFailures,
    resetThresholdFailures,
    validateTestResult,
} from './testRunner.js';

export const setupTest = (testName, testData, options = {}) => {
    initLogger(testName);
    
    if (options.validate !== false && testData) {
        validateTestData(testData, `${testName.toUpperCase()}_CHECKS`);
    }
    
    const env = __ENV.ENVIRONMENT || 'dev';
    const apiKeys = __ENV.GROQ_API_KEYS || __ENV.GROQ_API_KEY;
    
    if (apiKeys && typeof apiKeys === 'string' && apiKeys.includes(',')) {
        const keys = apiKeys.split(',').map(k => k.trim());
        initSecretRotation(keys, { strategy: 'round-robin', shuffle: true });
        logger.info('Secret rotation initialized', { keyCount: keys.length, strategy: 'round-robin' });
    }
    
    if (options.slo !== false) {
        setSloEnforcement(true);
    }
    
    resetSloMetrics();
    resetThresholdFailures();
    
    logger.info(`${testName} test starting`, { 
        vus: options.vus || 1,
        iterations: options.iterations || 1,
        environment: env,
        sloEnforcement: options.slo !== false,
    });
    
    return logger;
};

export const logResult = (type, status, data = {}) => {
    logger.result({ type, status, ...data });
};

export const handleError = (error, context = {}) => {
    logger.error('Test error', { error: error.message, ...context });
};

export const recordTestResult = (testName, passed) => {
    flakyDetector.record(testName, passed);
};

export const getFlakyTests = () => flakyDetector.getFlakyTests();

export const evaluateSLOs = (testType) => {
    return reportSLOs(testType);
};

export { 
    check, 
    sleep, 
    logger, 
    createCorrelationId,
    recordRequest,
    recordQualityFailure,
    recordHallucination,
    recordInconsistency,
    flakyDetector,
    recordThresholdFailure,
    hasThresholdFailures,
    validateTestResult,
    syncK6Metrics,
};
