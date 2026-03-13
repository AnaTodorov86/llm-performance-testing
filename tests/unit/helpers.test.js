import { describe, it, expect } from 'vitest';

const normalize = (str) => str?.trim().toLowerCase() || '';

function isCorrectAnswer(answer, expected) {
    if (!answer) return false;
    
    const normalizedAnswer = normalize(answer);
    
    if (Array.isArray(expected)) {
        return expected.some(e => isCorrectAnswer(answer, e));
    }
    
    return normalizedAnswer === normalize(expected);
}

function followsLengthInstruction(answer, maxWords = 5) {
    if (!answer) return false;
    const words = answer.trim().split(/\s+/).filter(w => w.length > 0);
    return words.length <= maxWords;
}

describe('isCorrectAnswer (KISS)', () => {
    it('exact match', () => expect(isCorrectAnswer('paris', 'paris')).toBe(true));
    it('case insensitive', () => expect(isCorrectAnswer('PARIS', 'paris')).toBe(true));
    it('whitespace trim', () => expect(isCorrectAnswer('  paris  ', 'paris')).toBe(true));
    it('no match', () => expect(isCorrectAnswer('london', 'paris')).toBe(false));
    it('array match', () => expect(isCorrectAnswer('hot', ['hot', 'warm'])).toBe(true));
    it('null/empty', () => {
        expect(isCorrectAnswer(null, 'paris')).toBe(false);
        expect(isCorrectAnswer('', 'paris')).toBe(false);
    });
});

describe('followsLengthInstruction', () => {
    it('within limit', () => expect(followsLengthInstruction('one two three', 5)).toBe(true));
    it('exceeds limit', () => expect(followsLengthInstruction('one two three four five six', 5)).toBe(false));
    it('default limit', () => expect(followsLengthInstruction('a b c d e f')).toBe(false));
    it('punctuation', () => expect(followsLengthInstruction('hello, world!', 5)).toBe(true));
    it('null/empty', () => {
        expect(followsLengthInstruction(null)).toBe(false);
        expect(followsLengthInstruction('')).toBe(false);
    });
});
