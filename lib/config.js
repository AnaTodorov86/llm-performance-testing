/**
 * lib/config.js
 * Single source of truth
 */

// ---------------------------------------------------------------------------
// API configuration
// ---------------------------------------------------------------------------

export const CONFIG = {
    apiUrl: 'https://api.groq.com/openai/v1/chat/completions',
    model:  'llama-3.1-8b-instant',
    apiKey: __ENV.GROQ_API_KEY || '',
};

// ---------------------------------------------------------------------------
// Stage profiles
// ---------------------------------------------------------------------------

export const STAGES_BASELINE = [
    { duration: '30s', target: 1 },
    { duration: '30s', target: 3 },
    { duration: '30s', target: 5 },
    { duration: '30s', target: 0 },
];

export const STAGES_LOAD = [
    { duration: '30s', target: 5  },
    { duration: '30s', target: 10 },
    { duration: '30s', target: 20 },
    { duration: '30s', target: 0  },
];

export const STAGES_STRESS = [
    { duration: '20s', target: 10 },
    { duration: '20s', target: 20 },
    { duration: '20s', target: 40 },
    { duration: '20s', target: 60 },
    { duration: '20s', target: 0  },
];

// ---------------------------------------------------------------------------
// Thresholds per scenario
// ---------------------------------------------------------------------------

export const THRESHOLDS_DEFAULT = {
    'llm_errors':  ['rate<0.1'],
    'llm_latency': ['p(95)<2000'],
    'llm_success': ['rate>0.9'],
};

export const THRESHOLDS_STRESS = {
    'llm_errors':  ['rate<0.2'],
    'llm_latency': ['p(95)<5000'],
    'llm_success': ['rate>0.8'],
};

export const THRESHOLDS_QUALITY = {
    'quality_failures': ['rate<0.1'],
    'hallucinations':   ['rate<0.05'],
    'inconsistencies':  ['rate<0.05'],
};

export const THRESHOLDS_CONSISTENCY = {
    'inconsistencies':  ['rate<0.1'],
    'consistency_pass': ['rate>0.9'],
};