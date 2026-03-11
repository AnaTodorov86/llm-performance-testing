import { Trend, Rate, Counter } from 'k6/metrics';

// ---------------------------------------------------------------------------
// Performance metrics (baseline / load / stress)
// ---------------------------------------------------------------------------

export const llmLatency     = new Trend('llm_latency');
export const llmErrors      = new Rate('llm_errors');
export const llmSuccess     = new Rate('llm_success');
export const llmRateLimits  = new Counter('llm_rate_limit_hits');

// ---------------------------------------------------------------------------
// Quality metrics (quality_test)
// ---------------------------------------------------------------------------

export const qualityFailures = new Rate('quality_failures');
export const hallucinations  = new Counter('hallucinations');

// ---------------------------------------------------------------------------
// Consistency metrics (consistency_test)
// ---------------------------------------------------------------------------

export const inconsistencies  = new Rate('inconsistencies');
export const consistencyPass  = new Rate('consistency_pass');
export const totalInconsistencies = new Counter('total_inconsistencies');