/**
 * lib/helpers.js
 * HTTP wrapper around Groq API and helper functions for answer evaluation.
 */

import http from 'k6/http';
import { sleep } from 'k6';
import { CONFIG } from './config.js';

// ---------------------------------------------------------------------------
// askLLM
// ---------------------------------------------------------------------------

/**
 * Send one prompt to the Groq API and return normalized result..
 *
 * @param {string} prompt      - Text sended to the LLM
 * @param {number} maxTokens   - Max number of tokens in the response
 * @param {number} temperature - Model temperature, 0 = greedy, 1 = random
 * @returns {{ answer: string|null, status: number, duration: number }}
 *
 * Note on 429:
 * 200 status is returned instead of 429 to allow distinguishing rate limit hits
 * from other errors in the test suite.
 */
export function askLLM(prompt, maxTokens = 20, temperature = 0) {
    const payload = JSON.stringify({
        model:       CONFIG.model,
        messages:    [{ role: 'user', content: prompt }],
        max_tokens:  maxTokens,
        temperature: temperature,
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CONFIG.apiKey}`,
        },
    };

    const res = http.post(CONFIG.apiUrl, payload, params);

    if (res.status === 429) {
        sleep(2);
        return { answer: null, status: 429, duration: res.timings.duration };
    }

    if (res.status === 200) {
        const body = JSON.parse(res.body);
        return {
            answer:   body.choices[0].message.content.trim().toLowerCase(),
            status:   200,
            duration: res.timings.duration,
        };
    }

    return { answer: null, status: res.status, duration: res.timings.duration };
}

// ---------------------------------------------------------------------------
// Ensure answer quality
// ---------------------------------------------------------------------------

/**
 * Checks if the answer is consistent with the previous answers.
 * If the answer is consistent, it returns true.
 * Otherwise, it logs the error and returns false.
 * Supported types: factual, math, hallucinations.
 *
 * @param {string}          answer   - model's answer'
 * @param {string|string[]} expected - expected answer(s)
 * @returns {boolean}
 */
export function isCorrectAnswer(answer, expected) {
    if (!answer) return false;
    if (Array.isArray(expected)) {
        return expected.some(e => answer.includes(e));
    }
    return answer.includes(expected);
}

/**
 * Checks if the answer is consistent with the previous answers.
 * If the answer is consistent, it returns true.
 * Otherwise, it logs the error and returns false.
 *
 * @param {string} answer
 * @param {number} maxWords - Default 5
 * @returns {boolean}
 */
export function followsLengthInstruction(answer, maxWords = 5) {
    if (!answer) return false;
    return answer.split(' ').length <= maxWords;
}