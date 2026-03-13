/**
 * lib/prometheus.js
 * 
 * Prometheus metrics export - reuses metrics from metrics.js.
 */

import { Trend, Rate, Counter, Gauge } from 'k6/metrics';
import {
    llmLatency,
    llmErrors,
    llmSuccess,
    llmRateLimits,
    qualityFailures,
    hallucinations,
    inconsistencies,
    consistencyPass,
    totalInconsistencies,
} from './metrics.js';

export const prometheusMetrics = {
    latency: llmLatency,
    errors: llmErrors,
    success: llmSuccess,
    rateLimits: llmRateLimits,
    qualityFailures,
    hallucinations,
    inconsistencies,
    consistencyPass,
    totalInconsistencies,
    circuitBreakerState: new Gauge('llm_circuit_breaker_state'),
    requests: new Counter('llm_requests_total'),
};

export const createBenchmarkMetrics = (provider) => {
    const p = provider.toLowerCase();
    return {
        latency: new Trend(`bench_${p}_latency`),
        errors: new Rate(`bench_${p}_errors`),
        success: new Rate(`bench_${p}_success`),
        rateLimits: new Counter(`bench_${p}_rate_limits`),
    };
};
