import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter } from 'k6/metrics';

const qualityFailRate = new Rate('quality_failures');
const hallucinations = new Counter('hallucinations');
const inconsistencies = new Counter('inconsistencies');

export const options = {
    vus: 3,
    iterations: 30,
    thresholds: {
        'quality_failures': ['rate<0.1'],
        'hallucinations': ['count<5'],
        'inconsistencies': ['count<5'],
    },
};

const API_KEY = __ENV.GROQ_API_KEY || '';

const QUALITY_CHECKS = [
    {
        prompt: 'What is the capital of France? Answer in one word only.',
        expected: 'paris',
        type: 'factual',
    },
    {
        prompt: 'What is 2+2? Answer with a single number only.',
        expected: '4',
        type: 'math',
    },
    {
        prompt: 'What is the opposite of cold? Answer in one word only.',
        expected: ['hot', 'warm'],
        type: 'factual',
    },
    {
        prompt: 'What is the capital of Germany? Answer in one word only.',
        expected: 'berlin',
        type: 'factual',
    },
    {
        prompt: 'What is 10+10? Answer with a single number only.',
        expected: '20',
        type: 'math',
    },
    {
        prompt: 'What color is the sky on a clear day? Answer in one word only.',
        expected: 'blue',
        type: 'factual',
    },
];

function askLLM(prompt) {
    const payload = JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 20,
        temperature: 0,
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${API_KEY}`,
        },
    };

    const res = http.post(
        'https://api.groq.com/openai/v1/chat/completions',
        payload,
        params
    );

    if (res.status === 200) {
        const body = JSON.parse(res.body);
        return body.choices[0].message.content.trim().toLowerCase();
    }

    return null;
}

export default function () {
    const testCase = QUALITY_CHECKS[Math.floor(Math.random() * QUALITY_CHECKS.length)];
    const answer = askLLM(testCase.prompt);

    if (answer === null) {
        sleep(2);
        return;
    }

    const isCorrect = Array.isArray(testCase.expected)
        ? testCase.expected.some(e => answer.includes(e))
        : answer.includes(testCase.expected);

    const isTooLong = answer.split(' ').length > 5;

    if (!isCorrect) {
        hallucinations.add(1);
        qualityFailRate.add(1);
        console.log(`❌ HALLUCINATION [${testCase.type}]`);
        console.log(`   Q: "${testCase.prompt}"`);
        console.log(`   Expected: "${testCase.expected}"`);
        console.log(`   Got: "${answer}"`);
    } else if (isTooLong) {
        inconsistencies.add(1);
        qualityFailRate.add(1);
        console.log(`⚠️ INSTRUCTION IGNORED [${testCase.type}]`);
        console.log(`   Q: "${testCase.prompt}"`);
        console.log(`   Got: "${answer}" (too long!)`);
    } else {
        qualityFailRate.add(0);
        console.log(`✅ [${testCase.type}] "${testCase.prompt}" → "${answer}"`);
    }

    check(answer, {
        'answer is not null': (a) => a !== null,
        'answer is correct': (a) => a !== null && (
            Array.isArray(testCase.expected)
                ? testCase.expected.some(e => a.includes(e))
                : a.includes(testCase.expected)
        ),
        'answer follows instructions': (a) => a !== null && a.split(' ').length <= 5,
    });

    sleep(1);
    }