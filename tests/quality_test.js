/**
 * tests/quality_test.js - KISS + DRY.
 */

import { THRESHOLDS_QUALITY } from '../lib/config.js';
import { qualityFailures, hallucinations } from '../lib/metrics.js';
import { askLLM, isCorrectAnswer, followsLengthInstruction } from '../lib/helpers.js';
import { QUALITY_CHECKS } from '../lib/prompts.js';
import { analyzeFailure } from '../lib/analyzer.js';
import { getProvider } from '../lib/providers.js';
import { setupTest, logResult, check, sleep, recordRequest, recordQualityFailure, recordHallucination, evaluateSLOs, recordTestResult, validateTestResult } from '../lib/testBase.js';

export const options = { 
    vus: 3, 
    iterations: 30, 
    thresholds: THRESHOLDS_QUALITY,
};

setupTest('quality', QUALITY_CHECKS);

export default function () {
    const testCase = QUALITY_CHECKS[Math.floor(Math.random() * QUALITY_CHECKS.length)];
    const { answer, status, provider: providerName, correlationId } = askLLM(testCase.prompt, 20, 0);
    const provider = providerName || getProvider().name;

    if (status === 429 || answer === null) { 
        sleep(2); 
        return; 
    }

    recordRequest(status === 200, 0);

    const correct = isCorrectAnswer(answer, testCase.expected);
    const wellFormed = followsLengthInstruction(answer);

    if (!correct) {
        hallucinations.add(1);
        qualityFailures.add(1);
        recordHallucination();
        recordQualityFailure();
        
        logResult('quality_check', 'hallucination', { correlationId, expected: testCase.expected, got: answer });
        analyzeFailure({ prompt: testCase.prompt, expected: testCase.expected, got: answer, type: testCase.type, provider });
        
        recordTestResult('quality_test', false);
    } else if (!wellFormed) {
        qualityFailures.add(1);
        recordQualityFailure();
        
        logResult('quality_check', 'instruction_ignored', { correlationId, got: answer });
        analyzeFailure({ prompt: testCase.prompt, expected: testCase.expected, got: answer, type: 'format', provider });
        
        recordTestResult('quality_test', false);
    } else {
        qualityFailures.add(0);
        logResult('quality_check', 'pass', { correlationId });
        
        recordTestResult('quality_test', true);
    }

    check(answer, {
        'answer is not null': a => a !== null,
        'answer is correct': a => isCorrectAnswer(a, testCase.expected),
        'answer follows instructions': a => followsLengthInstruction(a),
    });

    sleep(1);
}

export function handleSummary(data) {
    const validation = validateTestResult('quality', null);
    const sloResult = evaluateSLOs('quality');
    
    return {
        'stdout': textSummary(data, sloResult, validation),
    };
}

function textSummary(data, sloResult, validation) {
    if (!data) return 'No data available';
    
    let output = `\n=== Quality Test Summary ===\n\n`;
    
    if (data.metrics?.hallucinations?.values) {
        output += `Hallucinations: ${data.metrics.hallucinations.values.count || 0}\n`;
    }
    
    if (data.metrics?.quality_failures?.values) {
        output += `Quality Failures: ${data.metrics.quality_failures.values.count || 0}\n`;
    }
    
    if (sloResult) {
        output += `\nSLO Status: ${sloResult.passed ? '✅ PASSED' : '❌ FAILED'}\n`;
        output += `Error Budget Remaining: ${sloResult.errorBudgetRemaining}%\n`;
    }
    
    if (validation && !validation.passed) {
        output += `\n❌ TEST VALIDATION FAILED:\n`;
        validation.errors.forEach(e => output += `  - ${e}\n`);
    } else {
        output += `\n✅ TEST VALIDATION PASSED\n`;
    }
    
    return output;
}
