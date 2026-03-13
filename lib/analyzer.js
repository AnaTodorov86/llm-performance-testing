/**
 * lib/analyzer.js
 *
 * Self-healing test analyzer.
 * When a test fails, this module calls Groq to analyze WHY it failed
 * and suggests concrete fixes — better prompts, adjusted thresholds,
 * or provider-specific workarounds.
 *
 * Results are written to reports/suggestions.json for the dashboard.
 *
 * Usage:
 *   import { analyzeFailure } from '../lib/analyzer.js';
 *
 *   if (!correct) {
 *     analyzeFailure({
 *       prompt:    testCase.prompt,
 *       expected:  testCase.expected,
 *       got:       answer,
 *       type:      testCase.type,
 *       provider:  provider.name,
 *     });
 *   }
 */

import http from 'k6/http';
import { CONFIG } from './config.js';

// ---------------------------------------------------------------------------
// analyzeFailure
// ---------------------------------------------------------------------------

/**
 * Sends a failed test case to Groq for analysis.
 * Returns the AI suggestion as a string, and appends it to suggestions.json.
 *
 * @param {{
 *   prompt:   string,
 *   expected: string | string[],
 *   got:      string,
 *   type:     string,
 *   provider: string,
 * }} failure
 * @returns {string} AI suggestion
 */
export function analyzeFailure(failure) {
    const { prompt, expected, got, type, provider } = failure;

    if (__ENV.ANALYZER_ENABLED === 'false') {
        return null;
    }

    const expectedStr = Array.isArray(expected) ? expected.join(' or ') : expected;

    const analysisPrompt = `You are a QA engineer analyzing a failed LLM test case.

Test details:
- Provider: ${provider}
- Type: ${type}
- Original prompt: "${prompt}"
- Expected answer: "${expectedStr}"
- Actual answer: "${got}"

Analyze why this test failed and provide:
1. Root cause (1 sentence)
2. Improved prompt suggestion
3. Threshold or expectation adjustment if needed

Be concise. Max 4 sentences total.`;

    const payload = JSON.stringify({
        model:       CONFIG.model,
        messages:    [{ role: 'user', content: analysisPrompt }],
        max_tokens:  200,
        temperature: 0,
    });

    const params = {
        headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${CONFIG.apiKey}`,
        },
    };

    const res = http.post(CONFIG.apiUrl, payload, params);

    if (res.status !== 200) {
        console.log(`⚠️  Analyzer: could not reach Groq (status ${res.status})`);
        return null;
    }

    let body;
    try {
        body = JSON.parse(res.body);
    } catch (e) {
        console.log(`⚠️  Analyzer: failed to parse response: ${e.message}`);
        return null;
    }

    if (!body.choices || !body.choices[0] || !body.choices[0].message) {
        console.log(`⚠️  Analyzer: invalid response structure`);
        return null;
    }

    const suggestion = body.choices[0].message.content.trim();

    console.log(`\n🔍 AI ANALYSIS [${provider}][${type}]`);
    console.log(`   Prompt:   "${prompt}"`);
    console.log(`   Expected: "${expectedStr}" | Got: "${got}"`);
    console.log(`   Suggestion: ${suggestion}\n`);

    return suggestion;
}