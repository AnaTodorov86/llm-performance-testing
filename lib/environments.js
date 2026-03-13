/**
 * lib/environments.js
 * 
 * Environment configuration (dev/staging/prod).
 */

export const ENVIRONMENTS = {
    dev: {
        name: 'development',
        groq: {
            apiUrl: 'https://api.groq.com/openai/v1/chat/completions',
            model: 'llama-3.1-8b-instant',
        },
        ollama: {
            apiUrl: 'http://localhost:11434/api/chat',
            model: 'llama3.2:1b',
        },
        thresholds: {
            errorRate: 0.7,
            p95Latency: 5000,
            successRate: 0.3,
        },
    },
    staging: {
        name: 'staging',
        groq: {
            apiUrl: 'https://api.groq.com/openai/v1/chat/completions',
            model: 'llama-3.1-8b-instant',
        },
        ollama: {
            apiUrl: 'http://localhost:11434/api/chat',
            model: 'llama3.2:1b',
        },
        thresholds: {
            errorRate: 0.3,
            p95Latency: 2500,
            successRate: 0.7,
        },
    },
    prod: {
        name: 'production',
        groq: {
            apiUrl: 'https://api.groq.com/openai/v1/chat/completions',
            model: 'llama-3.1-8b-instant',
        },
        ollama: {
            apiUrl: 'http://localhost:11434/api/chat',
            model: 'llama3.2:1b',
        },
        thresholds: {
            errorRate: 0.1,
            p95Latency: 1500,
            successRate: 0.9,
        },
    },
};

export const getEnvironment = () => {
    const env = (__ENV.ENVIRONMENT || 'dev').toLowerCase();
    if (!ENVIRONMENTS[env]) {
        throw new Error(`Unknown ENVIRONMENT: "${env}". Available: dev | staging | prod`);
    }
    return ENVIRONMENTS[env];
};

export const getThresholds = () => getEnvironment().thresholds;
export const getProviderConfig = (provider) => getEnvironment()[provider];
