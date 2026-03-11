/**
 * tests/quality_test.js
 * Testing LLM's quality.'
 *
 * How to run:
 *   k6 run --env GROQ_API_KEY=$KEY tests/quality_test.js
 */

import { check, sleep } from 'k6';

import { THRESHOLDS_QUALITY } from '../lib/config.js';
import { qualityFailures, hallucinations } from '../lib/metrics.js';
import { askLLM, isCorrectAnswer, followsLengthInstruction } from '../lib/helpers.js';
import { QUALITY_CHECKS } from '../lib/prompts.js';

// ---------------------------------------------------------------------------
// k6 options
// ---------------------------------------------------------------------------

export const options = {
    vus:        3,
    iterations: 30,
    thresholds: THRESHOLDS_QUALITY,
};

// ---------------------------------------------------------------------------
// Test logic
// ---------------------------------------------------------------------------

export default function () {
    const testCase = QUALITY_CHECKS[Math.floor(Math.random() * QUALITY_CHECKS.length)];
    const { answer, status } = askLLM(testCase.prompt, 20, 0);

    if (status === 429 || answer === null) {
        sleep(2);
        return;
    }

    const correct     = isCorrectAnswer(answer, testCase.expected);
    const wellFormed  = followsLengthInstruction(answer);

    if (!correct) {
        hallucinations.add(1);
        qualityFailures.add(1);
        console.log(`❌ HALLUCINATION [${testCase.type}]`);
        console.log(`   Q:        "${testCase.prompt}"`);
        console.log(`   Expected: "${testCase.expected}"`);
        console.log(`   Got:      "${answer}"`);
    } else if (!wellFormed) {
        qualityFailures.add(1);
        console.log(`⚠️  INSTRUCTION IGNORED [${testCase.type}]`);
        console.log(`   Q:   "${testCase.prompt}"`);
        console.log(`   Got: "${answer}" (previše riječi)`);
    } else {
        qualityFailures.add(0);
        console.log(`✅ [${testCase.type}] "${testCase.prompt}" → "${answer}"`);
    }

    check(answer, {
        'answer is not null':             (a) => a !== null,
        'answer is correct':              (a) => isCorrectAnswer(a, testCase.expected),
        'answer follows instructions':    (a) => followsLengthInstruction(a),
    });

    sleep(1);
}