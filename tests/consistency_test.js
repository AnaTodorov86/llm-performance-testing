/**
 * tests/consistency_test.js - KISS + DRY.
 */

import { THRESHOLDS_CONSISTENCY } from '../lib/config.js';
import { inconsistencies, consistencyPass, totalInconsistencies } from '../lib/metrics.js';
import { askLLM, isCorrectAnswer } from '../lib/helpers.js';
import { makeConsistencyChecks } from '../lib/prompts.js';
import { analyzeFailure } from '../lib/analyzer.js';
import { getProvider } from '../lib/providers.js';
import { setupTest, logResult, check, sleep } from '../lib/testBase.js';

export const options = { vus: 1, iterations: 30, thresholds: THRESHOLDS_CONSISTENCY };

const CHECKS = makeConsistencyChecks();
setupTest('consistency', CHECKS);

const provider = getProvider();

export default function () {
    const testCase = CHECKS[Math.floor(Math.random() * CHECKS.length)];
    const { answer, status, correlationId } = askLLM(testCase.prompt, 20, 0);

    if (status === 429 || answer === null) { sleep(2); return; }

    const correct = isCorrectAnswer(answer, testCase.expected);
    const prevAnswers = testCase.answers.slice();
    const isConsistent = prevAnswers.length === 0 || prevAnswers.every(prev => prev === answer);
    testCase.answers.push(answer);

    if (!correct) {
        inconsistencies.add(1);
        consistencyPass.add(0);
        totalInconsistencies.add(1);
        logResult('consistency_check', 'wrong_answer', { correlationId, expected: testCase.expected, got: answer });
        analyzeFailure({ prompt: testCase.prompt, expected: testCase.expected, got: answer, type: 'consistency-wrong-answer', provider: provider.name });
    } else if (!isConsistent) {
        inconsistencies.add(1);
        consistencyPass.add(0);
        totalInconsistencies.add(1);
        logResult('consistency_check', 'inconsistent', { correlationId, previous: prevAnswers[prevAnswers.length - 1], current: answer });
        analyzeFailure({ prompt: testCase.prompt, expected: prevAnswers[prevAnswers.length - 1], got: answer, type: 'consistency-drift', provider: provider.name });
    } else {
        inconsistencies.add(0);
        consistencyPass.add(1);
        logResult('consistency_check', 'pass', { correlationId, retryCount: testCase.answers.length });
    }

    check(answer, {
        'answer is not null': a => a !== null,
        'answer is correct': a => isCorrectAnswer(a, testCase.expected),
        'answer is consistent': () => isConsistent,
    });

    sleep(1);
}
