/**
 * lib/helpers.js
 *
 * Provider-agnostic HTTP wrapper and answer evaluation functions.
 *
 * askLLM() no longer reads CONFIG directly — it receives a provider object
 * from lib/providers.js. This keeps helpers pure and testable across providers.
 */

import http  from 'k6/http';
import { sleep } from 'k6';
import { getProvider } from './providers.js';

// ---------------------------------------------------------------------------
// askLLM
// ---------------------------------------------------------------------------

/**
 * Sends one prompt to the given provider and returns a normalized result.
 *
 * @param {string} prompt      - Text sent to the LLM
 * @param {number} maxTokens   - Max tokens in the response (default 20)
 * @param {number} temperature - Model temperature: 0 = deterministic (default)
 * @param {object} [provider]  - Provider object from getProvider(). If omitted,
 *                               reads PROVIDER env var (defaults to 'groq').
 * @returns {{ answer: string|null, status: number, duration: number, provider: string }}
 */
export function askLLM(prompt, maxTokens = 20, temperature = 0, provider = getProvider()) {
    const payload = provider.buildPayload(prompt, maxTokens, temperature);
    const params  = { headers: provider.headers() };
    const res     = http.post(provider.apiUrl, payload, params);

    if (res.status === 429) {
        sleep(2);
        return { answer: null, status: 429, duration: res.timings.duration, provider: provider.name };
    }

    if (res.status === 200) {
        return {
            answer:   provider.parseResponse(res.body),
            status:   200,
            duration: res.timings.duration,
            provider: provider.name,
        };
    }

    return { answer: null, status: res.status, duration: res.timings.duration, provider: provider.name };
}

// ---------------------------------------------------------------------------
// Answer evaluation
// ---------------------------------------------------------------------------

/**
 * Checks if the answer contains the expected value.
 * Supports both string and array of acceptable answers.
 *
 * @param {string}          answer
 * @param {string|string[]} expected
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
 * Checks if the answer respects the "one word / short answer" instruction.
 *
 * @param {string} answer
 * @param {number} maxWords - Default 5 (tolerance for punctuation)
 * @returns {boolean}
 */
export function followsLengthInstruction(answer, maxWords = 5) {
    if (!answer) return false;
    return answer.split(' ').length <= maxWords;
}