import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

const latency = new Trend('llm_latency');
const errorRate = new Rate('llm_errors');
const rateLimitHits = new Counter('llm_rate_limit_hits');
const successRate = new Rate('llm_success');

export const options = {
    stages: [
        { duration: '30s', target: 1 },  // start lagano
        { duration: '30s', target: 3 },  // optimalna zona
        { duration: '30s', target: 5 },  // maksimum pre rate limita
        { duration: '30s', target: 0 },  // ramp down
    ],
    thresholds: {
        'llm_errors': ['rate<0.1'],
        'llm_latency': ['p(95)<2000'],
        'llm_success': ['rate>0.9'],
    },
};

const API_KEY = __ENV.GROQ_API_KEY || '';

const PROMPTS = [
    'Say hello in one word',
    'What is 2+2? Answer in one word',
    'Name one color',
    'Name one animal',
    'What is the capital of France? One word answer',
];

export default function () {
    // svaki korisnik dobija random prompt — realističniji scenario
    const prompt = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];

    const payload = JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
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
        'response has content': (r) => r.body.length > 0,
        'response time OK': (r) => r.timings.duration < 2000,
    });

    sleep(1);
}