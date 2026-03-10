import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

const latency = new Trend('llm_latency');
const errorRate = new Rate('llm_errors');
const rateLimitHits = new Counter('llm_rate_limit_hits');
const successRate = new Rate('llm_success');

export const options = {
    stages: [
        { duration: '30s', target: 5 },
        { duration: '30s', target: 10 },
        { duration: '30s', target: 20 },
        { duration: '30s', target: 0 },
    ],
    thresholds: {
        'llm_errors': ['rate<0.1'],
        'llm_latency': ['p(95)<2000'],
        'llm_success': ['rate>0.9'],
    },
};

const API_KEY = __ENV.GROQ_API_KEY || '';

export default function () {
    const payload = JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: 'Say hello in one word' }],
        max_tokens: 10,
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${API_KEY}`,
        },
    };

    const start = Date.now();
    const res = http.post(
        'https://api.groq.com/openai/v1/chat/completions',
        payload,
        params
    );
    const duration = Date.now() - start;

    latency.add(duration);

    if (res.status === 429) {
        rateLimitHits.add(1);
        console.log(`⚠️ RATE LIMIT hit! Waiting...`);
        sleep(2);
    } else if (res.status === 200) {
        errorRate.add(0);
        successRate.add(1);
    } else {
        errorRate.add(1);
        successRate.add(0);
        console.log(`❌ Error ${res.status}: ${res.body}`);
    }

    check(res, {
        'status is 200': (r) => r.status === 200,
        'status is 429 (rate limit)': (r) => r.status === 429,
        'response has content': (r) => r.body.length > 0,
    });

    sleep(1);
}