/**
 * tests/consistency_test.js
 * Testing LLM's consistency.'
 *
 * How to run:
 *   k6 run --env GROQ_API_KEY=$KEY tests/consistency_test.js
 */

import { check, sleep } from 'k6';

import { THRESHOLDS_CONSISTENCY } from '../lib/config.js';
import {
    inconsistencies,
    consistencyPass,
    totalInconsistencies,
} from '../lib/metrics.js';
import { askLLM, isCorrectAnswer } from '../lib/helpers.js';
import { makeConsistencyChecks }   from '../lib/prompts.js';

// ---------------------------------------------------------------------------
// k6 options
// ---------------------------------------------------------------------------

export const options = {
    vus:        1,
    iterations: 30,
    thresholds: THRESHOLDS_CONSISTENCY,
};


const CHECKS = makeConsistencyChecks();

// ---------------------------------------------------------------------------
// Test logic
// ---------------------------------------------------------------------------

export default function () {
    const testCase = CHECKS[Math.floor(Math.random() * CHECKS.length)];
    const { answer, status } = askLLM(testCase.prompt, 20, 0);

    if (status === 429 || answer === null) {
        sleep(2);
        return;
    }

    const correct       = isCorrectAnswer(answer, testCase.expected);
    const prevAnswers   = testCase.answers.slice();
    const isConsistent  = prevAnswers.length === 0 || prevAnswers.every(prev => prev === answer);

    testCase.answers.push(answer);

    if (!correct) {
        inconsistencies.add(1);
        consistencyPass.add(0);
        totalInconsistencies.add(1);
        console.log(`❌ WRONG ANSWER`);
        console.log(`   Q:        "${testCase.prompt}"`);
        console.log(`   Expected: "${testCase.expected}"`);
        console.log(`   Got:      "${answer}"`);
    } else if (!isConsistent) {
        inconsistencies.add(1);
        consistencyPass.add(0);
        totalInconsistencies.add(1);
        console.log(`⚠️  INCONSISTENT ANSWER`);
        console.log(`   Q:       "${testCase.prompt}"`);
        console.log(`   Before:  "${prevAnswers[prevAnswers.length - 1]}"`);
        console.log(`   Now:    "${answer}"`);
    } else {
        inconsistencies.add(0);
        consistencyPass.add(1);
        console.log(`✅ [retry #${testCase.answers.length}] "${testCase.prompt}" → "${answer}"`);
    }

    check(answer, {
        'answer is not null':   (a) => a !== null,
        'answer is correct':    (a) => isCorrectAnswer(a, testCase.expected),
        'answer is consistent': () => isConsistent,
    });

    sleep(1);
}