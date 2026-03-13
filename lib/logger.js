/**
 * lib/logger.js
 * 
 * Single logger instance - DRY principle.
 * Import once, use everywhere.
 */

let testRunId = null;

const generateId = () => 
    Math.random().toString(36).substring(2, 15) + 
    Math.random().toString(36).substring(2, 15);

export const initLogger = (testName = 'test') => {
    testRunId = `${testName}-${Date.now()}-${generateId().substring(0, 8)}`;
    return testRunId;
};

export const getTestRunId = () => testRunId;

export const log = (level, message, data = {}) => {
    console.log(JSON.stringify({
        level,
        timestamp: new Date().toISOString(),
        testRunId,
        ...data,
        message,
    }));
};

export const logger = {
    info:  (msg, d) => log('INFO', msg, d),
    error: (msg, d) => log('ERROR', msg, d),
    warn:  (msg, d) => log('WARN', msg, d),
    debug: (msg, d) => log('DEBUG', msg, d),
    result: (d) => log('RESULT', d.type || 'result', d),
};

export const createCorrelationId = generateId;
