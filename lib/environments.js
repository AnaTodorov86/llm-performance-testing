/**
 * lib/environments.js
 * 
 * Multi-environment configuration (dev/staging/prod).
 * Google SDET standard: environment-aware configuration.
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
            errorRate: 0.15,
            p95Latency: 5000,
            successRate: 0.85,
        },
    },
    staging: {
        name: 'staging',
        groq: {
            apiUrl: 'https://api.groq.com/openai/v1/chat/completions',
            model: 'llama-3.1-70b-versatile',
        },
        ollama: {
            apiUrl: 'http://ollama-staging:11434/api/chat',
            model: 'llama3.2:3b',
        },
        thresholds: {
            errorRate: 0.10,
            p95Latency: 3000,
            successRate: 0.90,
        },
    },
    prod: {
        name: 'production',
        groq: {
            apiUrl: 'https://api.groq.com/openai/v1/chat/completions',
            model: 'llama-3.1-70b-versatile',
        },
        ollama: {
            apiUrl: 'http://ollama-prod:11434/api/chat',
            model: 'llama3.2:3b',
        },
        thresholds: {
            errorRate: 0.05,
            p95Latency: 2000,
            successRate: 0.95,
        },
    },
};

export const getEnvironment = () => {
    const env = (__ENV.ENVIRONMENT || 'dev').toLowerCase();
    if (!ENVIRONMENTS[env]) {
        throw new Error(`Unknown ENVIRONMENT: "${env}". Available: ${Object.keys(ENVIRONMENTS).join(', ')}`);
    }
    return ENVIRONMENTS[env];
};

export const getThresholds = () => getEnvironment().thresholds;
export const getProviderConfig = (provider) => getEnvironment()[provider];
