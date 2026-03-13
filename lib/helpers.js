/**
 * lib/helpers.js
 *
 * Provider-agnostic HTTP wrapper with circuit breaker.
 * KISS: Simple, single responsibility.
 */

import http  from 'k6/http';
import { sleep } from 'k6';
import { getProvider } from './providers.js';
import { logger, createCorrelationId } from './logger.js';
import { llmCircuitBreaker } from './circuitBreaker.js';
import { prometheusMetrics } from './prometheus.js';
import { getEnvironment } from './environments.js';

const metrics = prometheusMetrics;

// ---------------------------------------------------------------------------
// askLLM with Circuit Breaker
// ---------------------------------------------------------------------------

export function askLLM(prompt, maxTokens = 20, temperature = 0, provider = getProvider()) {
    if (!llmCircuitBreaker.canExecute()) {
        logger.warn('Circuit breaker OPEN - skipping request');
        metrics.circuitBreakerState.add(1);
        return { answer: null, status: 503, duration: 0, provider: provider.name, error: 'circuit_open' };
    }

    metrics.circuitBreakerState.add(0);
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

        metrics.requests.add(1);

        if (res.status === 429) {
            metrics.rateLimits.add(1);
            llmCircuitBreaker.recordFailure();
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
                
                llmCircuitBreaker.recordSuccess();
                metrics.latency.add(res.timings.duration);
                metrics.success.add(1);
                
                logger.debug('LLM request completed', { 
                    correlationId, 
                    status: 200,
                    duration: result.duration,
                });
                
                return result;
            } catch (e) {
                llmCircuitBreaker.recordFailure();
                metrics.errors.add(1);
                logger.error('Failed to parse LLM response', { 
                    correlationId, 
                    error: e.message,
                });
                lastError = { status: 500, duration: res.timings.duration };
            }
        } else {
            llmCircuitBreaker.recordFailure();
            metrics.errors.add(1);
        }

        lastError = { status: res.status, duration: res.timings.duration };
        break;
    }

    logger.error('LLM request failed', { 
        correlationId, 
        status: lastError?.status,
        duration: lastError?.duration,
    });

    return { 
        answer: null, 
        status: lastError?.status || 500, 
        duration: lastError?.duration || 0, 
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