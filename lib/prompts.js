/**
 * lib/prompts.js
 *
 * The structure of this file is inspired by the structure of the
 * https://github.com/openai/openai-cookbook/blob/main/examples/How_to_format_inputs_to_ChatGPT_models.ipynb
 * notebook.
 *
 */

// ---------------------------------------------------------------------------
// Performance prompts
// Used by: baseline_test, load_test, stress_test, performance_test
// ---------------------------------------------------------------------------

export const PERFORMANCE_PROMPTS = [
    'Say hello in one word',
    'What is 2+2? Answer in one word',
    'Name one color',
    'Name one animal',
    'What is the capital of France? One word answer',
    'Name one fruit',
    'What is the opposite of hot? One word',
    'Name one planet',
];

// ---------------------------------------------------------------------------
// Quality checks
// Used by: quality_test
//
// Each object:
//   prompt
//   expected
//   type - 'factual' | 'math'
// ---------------------------------------------------------------------------

export const QUALITY_CHECKS = [
    {
        prompt:   'What is the capital of France? Answer in one word only.',
        expected: 'paris',
        type:     'factual',
    },
    {
        prompt:   'What is 2+2? Answer with a single number only.',
        expected: '4',
        type:     'math',
    },
    {
        prompt:   'What is the opposite of cold? Answer in one word only.',
        expected: ['hot', 'warm'],
        type:     'factual',
    },
    {
        prompt:   'What is the capital of Germany? Answer in one word only.',
        expected: 'berlin',
        type:     'factual',
    },
    {
        prompt:   'What is 10+10? Answer with a single number only.',
        expected: '20',
        type:     'math',
    },
    {
        prompt:   'What color is the sky on a clear day? Answer in one word only.',
        expected: 'blue',
        type:     'factual',
    },
];

// ---------------------------------------------------------------------------
// Consistency checks
// Used by: consistency_test
//
// ---------------------------------------------------------------------------

export function makeConsistencyChecks() {
    return [
        {
            prompt:   'What is the capital of France? One word only.',
            expected: 'paris',
            answers:  [],
        },
        {
            prompt:   'What is 5+5? Single number only.',
            expected: '10',
            answers:  [],
        },
        {
            prompt:   'What is the capital of Japan? One word only.',
            expected: 'tokyo',
            answers:  [],
        },
        {
            prompt:   'What color is grass? One word only.',
            expected: 'green',
            answers:  [],
        },
        {
            prompt:   'What is 3x3? Single number only.',
            expected: '9',
            answers:  [],
        },
    ];
}