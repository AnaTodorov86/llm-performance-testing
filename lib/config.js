/**
 * lib/config.js
 * Single source of truth - integrates with environments.js
 */

import { getProvider } from './providers.js';
import { getEnvironment, getThresholds } from './environments.js';

const providerName = (__ENV.PROVIDER || 'groq').toLowerCase();

if (providerName === 'groq' && !(__ENV.GROQ_API_KEY)) {
    throw new Error('GROQ_API_KEY environment variable is required. Set it with: export GROQ_API_KEY=your_key');
}

const activeProvider = getProvider();

export const CONFIG = {
    apiUrl: activeProvider.apiUrl,
    model:  activeProvider.model,
    apiKey: activeProvider.apiKey,
};

const env = getEnvironment();
const thresholds = getThresholds();

// ---------------------------------------------------------------------------
// Stage profiles (same across environments)
// ---------------------------------------------------------------------------

export const STAGES_BASELINE = [
    { duration: '30s', target: 1 },
    { duration: '30s', target: 3 },
    { duration: '30s', target: 5 },
    { duration: '30s', target: 0 },
];

export const STAGES_LOAD = [
    { duration: '30s', target: 3  },
    { duration: '30s', target: 4  },
    { duration: '30s', target: 5  },
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
// Environment-aware thresholds
// ---------------------------------------------------------------------------

export const THRESHOLDS_DEFAULT = {
    'llm_errors':  [`rate<${thresholds.errorRate + 0.1}`],
    'llm_latency': [`p(95)<${thresholds.p95Latency}`],
    'llm_success': [`rate>${thresholds.successRate - 0.1}`],
};

export const THRESHOLDS_STRESS = {
    'llm_errors':  [`rate<${(thresholds.errorRate + 0.1) * 2}`],
    'llm_latency': [`p(95)<${thresholds.p95Latency * 1.5}`],
    'llm_success': [`rate>${thresholds.successRate - 0.15}`],
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

export const ENVIRONMENT = env.name;