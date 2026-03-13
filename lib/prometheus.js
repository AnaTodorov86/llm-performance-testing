/**
 * lib/prometheus.js
 * 
 * Prometheus metrics export for observability.
 * Google SDET standard: all metrics should be exportable.
 */

import { Trend, Rate, Counter, Gauge } from 'k6/metrics';

export const createPrometheusMetrics = (prefix = 'llm_test') => ({
    latency: new Trend(`${prefix}_latency`, true),
    errors: new Rate(`${prefix}_errors`),
    success: new Rate(`${prefix}_success`),
    rateLimits: new Counter(`${prefix}_rate_limits`),
    requests: new Counter(`${prefix}_requests_total`),
    qualityFailures: new Rate(`${prefix}_quality_failures`),
    hallucinations: new Counter(`${prefix}_hallucinations`),
    inconsistencies: new Rate(`${prefix}_inconsistencies`),
    circuitBreakerState: new Gauge(`${prefix}_circuit_breaker_state`),
});

export const createBenchmarkMetrics = (provider) => {
    const p = provider.toLowerCase();
    return createPrometheusMetrics(`bench_${p}`);
};

export const formatPrometheusOutput = (metrics) => {
    const lines = [];
    
    const addMetric = (name, value, labels = {}) => {
        const labelStr = Object.entries(labels)
            .map(([k, v]) => `${k}="${v}"`)
            .join(',');
        lines.push(`${name}${labelStr ? `{${labelStr}}` : ''} ${value}`);
    };
    
    return lines.join('\n');
};
