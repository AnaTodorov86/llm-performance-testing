/**
 * lib/flakyDetector.js
 * 
 * Flaky test detection - Google SDET standard.
 * Identifies tests that pass/fail inconsistently.
 */

export class FlakyDetector {
    constructor(options = {}) {
        this.windowSize = options.windowSize || 10;
        this.flakyThreshold = options.flakyThreshold || 0.3;
        this.results = new Map();
    }

    record(testName, passed) {
        if (!this.results.has(testName)) {
            this.results.set(testName, []);
        }
        
        const testResults = this.results.get(testName);
        testResults.push(passed ? 1 : 0);
        
        if (testResults.length > this.windowSize) {
            testResults.shift();
        }
    }

    isFlaky(testName) {
        const results = this.results.get(testName);
        if (!results || results.length < 3) return false;

        const failures = results.filter(r => r === 0).length;
        const failureRate = failures / results.length;

        return failureRate >= this.flakyThreshold && failureRate <= (1 - this.flakyThreshold);
    }

    getFlakyTests() {
        return Array.from(this.results.keys()).filter(name => this.isFlaky(name));
    }

    getStats(testName) {
        const results = this.results.get(testName) || [];
        const failures = results.filter(r => r === 0).length;
        return {
            runs: results.length,
            failures,
            failureRate: results.length > 0 ? (failures / results.length).toFixed(2) : 0,
            isFlaky: this.isFlaky(testName),
        };
    }

    reset(testName) {
        this.results.delete(testName);
    }

    resetAll() {
        this.results.clear();
    }
}

export const flakyDetector = new FlakyDetector();
