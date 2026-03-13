/**
 * lib/helpers.js
 *
 * Provider-agnostic HTTP wrapper and answer evaluation functions.
 * KISS: Simple, single responsibility.
 */

import http  from 'k6/http';
import { sleep } from 'k6';
import { getProvider } from './providers.js';
import { logger, createCorrelationId } from './logger.js';

// ---------------------------------------------------------------------------
// askLLM
// ---------------------------------------------------------------------------

export function askLLM(prompt, maxTokens = 20, temperature = 0, provider = getProvider()) {
    const correlationId = createCorrelationId();
    const maxRetries = 3;
    let lastError = null;

    logger.debug('LLM request started', { 
        correlationId, 
        promptLength: prompt.length,
        provider: provider.name,
        maxTokens,
        temperature,
    });

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        const payload = provider.buildPayload(prompt, maxTokens, temperature);
        const params  = { headers: provider.headers() };
        const res     = http.post(provider.apiUrl, payload, params);

        if (res.status === 429) {
            const backoff = Math.pow(2, attempt);
            logger.warn('Rate limited, retrying', { 
                correlationId, 
                attempt: attempt + 1, 
                maxRetries,
                backoffSeconds: backoff,
            });
            sleep(backoff);
            lastError = { status: 429, duration: res.timings.duration };
            continue;
        }

        if (res.status === 200) {
            try {
                const result = {
                    answer:   provider.parseResponse(res.body),
                    status:   200,
                    duration: res.timings.duration,
                    provider: provider.name,
                    correlationId,
                };
                
                logger.debug('LLM request completed', { 
                    correlationId, 
                    status: 200,
                    duration: result.duration,
                });
                
                return result;
            } catch (e) {
                logger.error('Failed to parse LLM response', { 
                    correlationId, 
                    error: e.message,
                });
                lastError = { status: 500, duration: res.timings.duration };
            }
        }

        lastError = { status: res.status, duration: res.timings.duration };
        break;
    }

    logger.error('LLM request failed', { 
        correlationId, 
        status: lastError.status,
        duration: lastError.duration,
    });

    return { 
        answer: null, 
        status: lastError.status, 
        duration: lastError.duration || 0, 
        provider: provider.name,
        correlationId,
    };
}

// ---------------------------------------------------------------------------
// Answer evaluation (KISS - simple and clear)
// ---------------------------------------------------------------------------

const normalize = (str) => str?.trim().toLowerCase() || '';

export function isCorrectAnswer(answer, expected) {
    if (!answer) return false;
    
    const normalizedAnswer = normalize(answer);
    
    if (Array.isArray(expected)) {
        return expected.some(e => isCorrectAnswer(answer, e));
    }
    
    return normalizedAnswer === normalize(expected);
}

export function followsLengthInstruction(answer, maxWords = 5) {
    if (!answer) return false;
    const words = answer.trim().split(/\s+/).filter(w => w.length > 0);
    return words.length <= maxWords;
}