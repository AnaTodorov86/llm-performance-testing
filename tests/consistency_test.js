/**
 * tests/consistency_test.js - KISS + DRY.
 */

import { THRESHOLDS_CONSISTENCY } from '../lib/config.js';
import { inconsistencies, consistencyPass, totalInconsistencies } from '../lib/metrics.js';
import { askLLM, isCorrectAnswer } from '../lib/helpers.js';
import { makeConsistencyChecks } from '../lib/prompts.js';
import { analyzeFailure } from '../lib/analyzer.js';
import { getProvider } from '../lib/providers.js';
import { setupTest, logResult, check, sleep, recordRequest, recordInconsistency, evaluateSLOs, recordTestResult, validateTestResult } from '../lib/testBase.js';

export const options = {
    vus: 1,
    iterations: 30,
    thresholds: THRESHOLDS_CONSISTENCY,
};

const CHECKS = makeConsistencyChecks();
setupTest('consistency', CHECKS);

const provider = getProvider();

export default function () {
    const testCase = CHECKS[Math.floor(Math.random() * CHECKS.length)];
    const { answer, status, correlationId } = askLLM(testCase.prompt, 20, 0);

    if (status === 429 || answer === null) {
        sleep(2);
        return;
    }

    recordRequest(status === 200, 0);

    const correct = isCorrectAnswer(answer, testCase.expected);
    const prevAnswers = testCase.answers.slice();
    const isConsistent = prevAnswers.length === 0 || prevAnswers.every(prev => prev === answer);
    testCase.answers.push(answer);

    if (!correct) {
        inconsistencies.add(1);
        consistencyPass.add(0);
        totalInconsistencies.add(1);
        recordInconsistency();
        
        logResult('consistency_check', 'wrong_answer', { correlationId, expected: testCase.expected, got: answer });
        analyzeFailure({ prompt: testCase.prompt, expected: testCase.expected, got: answer, type: 'consistency-wrong-answer', provider: provider.name });
        
        recordTestResult('consistency_test', false);
    } else if (!isConsistent) {
        inconsistencies.add(1);
        consistencyPass.add(0);
        totalInconsistencies.add(1);
        recordInconsistency();
        
        logResult('consistency_check', 'inconsistent', { correlationId, previous: prevAnswers[prevAnswers.length - 1], current: answer });
        analyzeFailure({ prompt: testCase.prompt, expected: prevAnswers[prevAnswers.length - 1], got: answer, type: 'consistency-drift', provider: provider.name });
        
        recordTestResult('consistency_test', false);
    } else {
        inconsistencies.add(0);
        consistencyPass.add(1);
        logResult('consistency_check', 'pass', { correlationId, retryCount: testCase.answers.length });
        
        recordTestResult('consistency_test', true);
    }

    check(answer, {
        'answer is not null': a => a !== null,
        'answer is correct': a => isCorrectAnswer(a, testCase.expected),
        'answer is consistent': () => isConsistent,
    });

    sleep(1);
}

export function handleSummary(data) {
    const validation = validateTestResult('consistency', null);
    const sloResult = evaluateSLOs('consistency');
    
    return {
        'stdout': textSummary(data, sloResult, validation),
    };
}

function textSummary(data, sloResult, validation) {
    if (!data) {
        return 'No data available';
    }
    
    let output = `\n=== Consistency Test Summary ===\n\n`;
    
    if (data.metrics?.total_inconsistencies?.values) {
        output += `Inconsistencies: ${data.metrics.total_inconsistencies.values.count || 0}\n`;
    }
    
    if (data.metrics?.consistency_pass?.values) {
        output += `Consistency Rate: ${(data.metrics.consistency_pass.values.rate * 100).toFixed(2)}%\n`;
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
