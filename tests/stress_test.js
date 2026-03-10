import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

const latency = new Trend('llm_latency');
const errorRate = new Rate('llm_errors');
const rateLimitHits = new Counter('llm_rate_limit_hits');
const successRate = new Rate('llm_success');

export const options = {
    stages: [
        { duration: '20s', target: 10 },  // brzo rampujemo
        { duration: '20s', target: 20 },  // guramo do limita
        { duration: '20s', target: 40 },  // stress zona
        { duration: '20s', target: 60 },  // ekstremni load
        { duration: '20s', target: 0 },   // ramp down
    ],
    thresholds: {
        'llm_latency': ['p(95)<5000'],    // opušteniji threshold za stress
    },
};

const API_KEY = __ENV.GROQ_API_KEY || '';

const PROMPTS = [
    'Say hello in one word',
    'What is 2+2? Answer in one word',
    'Name one color',
    'Name one animal',
    'What is the capital of France? One word answer',
    'Name one fruit',
    'What is the opposite of hot? One word',
    'Name one planet',
];

export default function () {
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
        // ne cekamo ovde - zelimo da vidimo sta se desi pod punim stresom
    } else if (res.status === 200) {
        errorRate.add(0);
        successRate.add(1);

        // logujemo uspesne odgovore da vidimo kvalitet pod stresom
        const body = JSON.parse(res.body);
        const answer = body.choices[0].message.content;
        console.log(`✅ [${res.timings.duration}ms] Q: "${prompt}" → A: "${answer}"`);
    } else {
        errorRate.add(1);
        successRate.add(0);
        console.log(`❌ Error ${res.status}`);
    }

    check(res, {
        'status is 200 or 429': (r) => r.status === 200 || r.status === 429,
        'response has content': (r) => r.body.length > 0,
    });

    sleep(0.5); // kraći sleep — više pritiska!
}