/**
 * tests/quality_test.js
 * Hallucination detection + self-healing analysis.
 *
 * When a test fails, analyzeFailure() is called automatically —
 * Groq analyzes the failure and suggests a fix, visible in the dashboard.
 *
 * Usage:
 *   k6 run --env GROQ_API_KEY=$KEY tests/quality_test.js
 */

import { check, sleep } from 'k6';

import { THRESHOLDS_QUALITY }                            from '../lib/config.js';
import { qualityFailures, hallucinations }               from '../lib/metrics.js';
import { askLLM, isCorrectAnswer, followsLengthInstruction } from '../lib/helpers.js';
import { QUALITY_CHECKS }                                from '../lib/prompts.js';
import { analyzeFailure }                                from '../lib/analyzer.js';

export const options = {
    vus:        3,
    iterations: 30,
    thresholds: THRESHOLDS_QUALITY,
};

export default function () {
    const testCase = QUALITY_CHECKS[Math.floor(Math.random() * QUALITY_CHECKS.length)];
    const { answer, status, provider } = askLLM(testCase.prompt, 20, 0);

    if (status === 429 || answer === null) {
        sleep(2);
        return;
    }

    const correct    = isCorrectAnswer(answer, testCase.expected);
    const wellFormed = followsLengthInstruction(answer);

    if (!correct) {
        hallucinations.add(1);
        qualityFailures.add(1);
        console.log(`❌ HALLUCINATION [${testCase.type}] Expected: "${testCase.expected}" | Got: "${answer}"`);

        // Self-healing: ask AI why this failed and how to fix it
        analyzeFailure({
            prompt:   testCase.prompt,
            expected: testCase.expected,
            got:      answer,
            type:     testCase.type,
            provider: provider || 'groq',
        });

    } else if (!wellFormed) {
        qualityFailures.add(1);
        console.log(`⚠️  INSTRUCTION IGNORED [${testCase.type}] Got: "${answer}" (too long)`);

        analyzeFailure({
            prompt:   testCase.prompt,
            expected: testCase.expected,
            got:      answer,
            type:     'format',
            provider: provider || 'groq',
        });

    } else {
        qualityFailures.add(0);
        console.log(`✅ [${testCase.type}] "${testCase.prompt}" → "${answer}"`);
    }

    check(answer, {
        'answer is not null':          (a) => a !== null,
        'answer is correct':           (a) => isCorrectAnswer(a, testCase.expected),
        'answer follows instructions': (a) => followsLengthInstruction(a),
    });

    sleep(1);
}