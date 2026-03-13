/**
 * tests/performance_test.js
 * Baseline / Load / Stress scenarios - KISS + DRY.
 */

import { STAGES_BASELINE, STAGES_LOAD, STAGES_STRESS, THRESHOLDS_DEFAULT, THRESHOLDS_STRESS } from '../lib/config.js';
import { llmLatency, llmErrors, llmSuccess, llmRateLimits } from '../lib/metrics.js';
import { askLLM } from '../lib/helpers.js';
import { PERFORMANCE_PROMPTS } from '../lib/prompts.js';
import { analyzeFailure } from '../lib/analyzer.js';
import { getProvider } from '../lib/providers.js';
import { setupTest, logResult } from '../lib/testBase.js';

const SCENARIO = (__ENV.TEST_SCENARIO || 'baseline').toLowerCase();
const STAGES = { baseline: STAGES_BASELINE, load: STAGES_LOAD, stress: STAGES_STRESS };
const THRESHOLDS = { baseline: THRESHOLDS_DEFAULT, load: THRESHOLDS_DEFAULT, stress: THRESHOLDS_STRESS };

if (!STAGES[SCENARIO]) throw new Error(`Unknown TEST_SCENARIO: "${SCENARIO}"`);

export const options = { stages: STAGES[SCENARIO], thresholds: THRESHOLDS[SCENARIO] };

setupTest('performance', null, { validate: false });

const provider = getProvider();

export default function () {
    const prompt = PERFORMANCE_PROMPTS[Math.floor(Math.random() * PERFORMANCE_PROMPTS.length)];
    const { answer, status, duration, correlationId } = askLLM(prompt, 10, 0);

    llmLatency.add(duration);

    if (status === 429) {
        llmRateLimits.add(1);
    } else if (status === 200) {
        llmErrors.add(0);
        llmSuccess.add(1);
        logResult('request', 'success', { correlationId, duration, promptLength: prompt.length });
    } else {
        llmErrors.add(1);
        llmSuccess.add(0);
        logResult('request', 'error', { correlationId, status });
        analyzeFailure({ prompt, expected: 'HTTP 200', got: `HTTP ${status}`, type: `performance-${SCENARIO}`, provider: provider.name });
    }

    check(answer, {
        'status is 200': () => status === 200,
        'response has content': () => answer !== null,
        'response time OK': () => duration < (SCENARIO === 'stress' ? 5000 : 2000),
    });

    sleep(SCENARIO === 'stress' ? 0.5 : 1);
}
