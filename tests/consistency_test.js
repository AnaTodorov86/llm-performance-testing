import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter } from 'k6/metrics';

const inconsistencyRate = new Rate('inconsistencies');
const consistencyPass = new Rate('consistency_pass');
const totalInconsistencies = new Counter('total_inconsistencies');

export const options = {
    vus: 1,
    iterations: 30,
    thresholds: {
        'inconsistencies': ['rate<0.1'],      // max 10% nekonzistentnih
        'consistency_pass': ['rate>0.9'],     // min 90% konzistentnih
    },
};

const API_KEY = __ENV.GROQ_API_KEY || '';

// svako pitanje ima ocekivani konzistentni odgovor
const CONSISTENCY_CHECKS = [
    {
        prompt: 'What is the capital of France? One word only.',
        expected: 'paris',
        asked: 0,
        answers: [],
    },
    {
        prompt: 'What is 5+5? Single number only.',
        expected: '10',
        asked: 0,
        answers: [],
    },
    {
        prompt: 'What is the capital of Japan? One word only.',
        expected: 'tokyo',
        asked: 0,
        answers: [],
    },
    {
        prompt: 'What color is grass? One word only.',
        expected: 'green',
        asked: 0,
        answers: [],
    },
    {
        prompt: 'What is 3x3? Single number only.',
        expected: '9',
        asked: 0,
        answers: [],
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
    const testCase = CONSISTENCY_CHECKS[Math.floor(Math.random() * CONSISTENCY_CHECKS.length)];

    const answer = askLLM(testCase.prompt);

    if (answer === null) {
        sleep(2);
        return;
    }

    testCase.asked++;
    testCase.answers.push(answer);

    const isCorrect = answer.includes(testCase.expected);

    // da li je odgovor konzistentan sa prethodnim?
    const previousAnswers = testCase.answers.slice(0, -1);
    const isConsistent = previousAnswers.length === 0 ||
        previousAnswers.every(prev => prev === answer);

    if (!isCorrect) {
        inconsistencyRate.add(1);
        consistencyPass.add(0);
        totalInconsistencies.add(1);
        console.log(`❌ WRONG ANSWER`);
        console.log(`   Q: "${testCase.prompt}"`);
        console.log(`   Expected: "${testCase.expected}"`);
        console.log(`   Got: "${answer}"`);
    } else if (!isConsistent) {
        inconsistencyRate.add(1);
        consistencyPass.add(0);
        totalInconsistencies.add(1);
        console.log(`⚠️ INCONSISTENT`);
        console.log(`   Q: "${testCase.prompt}"`);
        console.log(`   Previous: "${previousAnswers[previousAnswers.length - 1]}"`);
        console.log(`   Now: "${answer}"`);
    } else {
        inconsistencyRate.add(0);
        consistencyPass.add(1);
        console.log(`✅ [ask #${testCase.asked}] "${testCase.prompt}" → "${answer}"`);
    }

    check(answer, {
        'answer is not null': (a) => a !== null,
        'answer is correct': (a) => a !== null && a.includes(testCase.expected),
        'answer is consistent': () => isConsistent,
    });

    sleep(1);
}