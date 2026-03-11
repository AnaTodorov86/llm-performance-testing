/**
 * tests/performance_test.js
 *
 * Run:
 *   k6 run --env GROQ_API_KEY=$KEY --env TEST_SCENARIO=baseline tests/performance_test.js
 *   k6 run --env GROQ_API_KEY=$KEY --env TEST_SCENARIO=load    tests/performance_test.js
 *   k6 run --env GROQ_API_KEY=$KEY --env TEST_SCENARIO=stress  tests/performance_test.js
 *
 */

import { check, sleep } from 'k6';

import {
    STAGES_BASELINE,
    STAGES_LOAD,
    STAGES_STRESS,
    THRESHOLDS_DEFAULT,
    THRESHOLDS_STRESS,
} from '../lib/config.js';

import {
    llmLatency,
    llmErrors,
    llmSuccess,
    llmRateLimits,
} from '../lib/metrics.js';

import { askLLM }            from '../lib/helpers.js';
import { PERFORMANCE_PROMPTS } from '../lib/prompts.js';

// ---------------------------------------------------------------------------
// Scenario selection
// ---------------------------------------------------------------------------

const SCENARIO = (__ENV.TEST_SCENARIO || 'baseline').toLowerCase();

const STAGE_MAP = {
    baseline: STAGES_BASELINE,
    load:     STAGES_LOAD,
    stress:   STAGES_STRESS,
};

const THRESHOLD_MAP = {
    baseline: THRESHOLDS_DEFAULT,
    load:     THRESHOLDS_DEFAULT,
    stress:   THRESHOLDS_STRESS,
};

if (!STAGE_MAP[SCENARIO]) {
    throw new Error(`Nepoznat TEST_SCENARIO: "${SCENARIO}". Dozvoljeno: baseline | load | stress`);
}

// ---------------------------------------------------------------------------
// k6 options
// ---------------------------------------------------------------------------

export const options = {
    stages:     STAGE_MAP[SCENARIO],
    thresholds: THRESHOLD_MAP[SCENARIO],
};

// ---------------------------------------------------------------------------
// Test logic
// ---------------------------------------------------------------------------

export default function () {
    const prompt = PERFORMANCE_PROMPTS[Math.floor(Math.random() * PERFORMANCE_PROMPTS.length)];
    const { answer, status, duration } = askLLM(prompt, 10, 0);

    llmLatency.add(duration);

    if (status === 429) {
        llmRateLimits.add(1);
    } else if (status === 200) {
        llmErrors.add(0);
        llmSuccess.add(1);
        console.log(`✅ [${SCENARIO}][${duration}ms] "${prompt}" → "${answer}"`);
    } else {
        llmErrors.add(1);
        llmSuccess.add(0);
        console.log(`❌ [${SCENARIO}] Error ${status}`);
    }

    check(answer, {
        'status is 200':        () => status === 200,
        'response has content': () => answer !== null,
        'response time OK':     () => duration < (SCENARIO === 'stress' ? 5000 : 2000),
    });

    sleep(SCENARIO === 'stress' ? 0.5 : 1);
}