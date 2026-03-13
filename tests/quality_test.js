/**
 * tests/quality_test.js - KISS + DRY.
 */

import { THRESHOLDS_QUALITY } from '../lib/config.js';
import { qualityFailures, hallucinations } from '../lib/metrics.js';
import { askLLM, isCorrectAnswer, followsLengthInstruction } from '../lib/helpers.js';
import { QUALITY_CHECKS } from '../lib/prompts.js';
import { analyzeFailure } from '../lib/analyzer.js';
import { getProvider } from '../lib/providers.js';
import { setupTest, logResult, check, sleep } from '../lib/testBase.js';

export const options = { vus: 3, iterations: 30, thresholds: THRESHOLDS_QUALITY };

setupTest('quality', QUALITY_CHECKS);

export default function () {
    const testCase = QUALITY_CHECKS[Math.floor(Math.random() * QUALITY_CHECKS.length)];
    const { answer, status, provider: providerName, correlationId } = askLLM(testCase.prompt, 20, 0);
    const provider = providerName || getProvider().name;

    if (status === 429 || answer === null) { sleep(2); return; }

    const correct = isCorrectAnswer(answer, testCase.expected);
    const wellFormed = followsLengthInstruction(answer);

    if (!correct) {
        hallucinations.add(1);
        qualityFailures.add(1);
        logResult('quality_check', 'hallucination', { correlationId, expected: testCase.expected, got: answer });
        analyzeFailure({ prompt: testCase.prompt, expected: testCase.expected, got: answer, type: testCase.type, provider });
    } else if (!wellFormed) {
        qualityFailures.add(1);
        logResult('quality_check', 'instruction_ignored', { correlationId, got: answer });
        analyzeFailure({ prompt: testCase.prompt, expected: testCase.expected, got: answer, type: 'format', provider });
    } else {
        qualityFailures.add(0);
        logResult('quality_check', 'pass', { correlationId });
    }

    check(answer, {
        'answer is not null': a => a !== null,
        'answer is correct': a => isCorrectAnswer(a, testCase.expected),
        'answer follows instructions': a => followsLengthInstruction(a),
    });

    sleep(1);
}
