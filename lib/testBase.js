/**
 * lib/testBase.js
 * 
 * Common test utilities - DRY principle.
 * Single source of truth for test patterns.
 */

import { check, sleep } from 'k6';
import { initLogger, logger, createCorrelationId } from './logger.js';
import { validateTestData } from './validator.js';

export const setupTest = (testName, testData, options = {}) => {
    initLogger(testName);
    
    if (options.validate !== false && testData) {
        validateTestData(testData, `${testName.toUpperCase()}_CHECKS`);
    }
    
    logger.info(`${testName} test starting`, { 
        vus: options.vus || 1,
        iterations: options.iterations || 1,
    });
    
    return logger;
};

export const logResult = (type, status, data = {}) => {
    logger.result({ type, status, ...data });
};

export const handleError = (error, context = {}) => {
    logger.error('Test error', { error: error.message, ...context });
};

export { check, sleep, logger, createCorrelationId };
