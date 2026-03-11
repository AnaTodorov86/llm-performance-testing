/**
 * lib/providers.js
 *
 * Provider abstraction layer — defines how each LLM provider is called.
 *
 * Each provider exposes a consistent interface:
 *   { name, apiUrl, apiKey, model, buildPayload, parseResponse }
 *
 * This allows tests to switch providers via the PROVIDER env variable
 * without changing any test logic.
 *
 * Supported providers:
 *   groq   — Groq Cloud API (OpenAI-compatible)
 *   ollama — Local Ollama instance (different payload/response format)
 *
 * Usage in tests:
 *   import { getProvider } from '../lib/providers.js';
 *   const provider = getProvider();  // reads __ENV.PROVIDER, defaults to 'groq'
 */

// ---------------------------------------------------------------------------
// Provider definitions
// ---------------------------------------------------------------------------

const PROVIDERS = {

    groq: {
        name:   'Groq',
        apiUrl: 'https://api.groq.com/openai/v1/chat/completions',
        apiKey: __ENV.GROQ_API_KEY || '',
        model:  __ENV.LLM_MODEL || 'llama-3.1-8b-instant',

        buildPayload(prompt, maxTokens, temperature) {
            return JSON.stringify({
                model:       this.model,
                messages:    [{ role: 'user', content: prompt }],
                max_tokens:  maxTokens,
                temperature: temperature,
            });
        },

        parseResponse(body) {
            const parsed = JSON.parse(body);
            return parsed.choices[0].message.content.trim().toLowerCase();
        },

        headers() {
            return {
                'Content-Type':  'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
            };
        },
    },

    ollama: {
        name:   'Ollama',
        apiUrl: __ENV.OLLAMA_URL || 'http://localhost:11434/api/chat',
        apiKey: '',
        model:  __ENV.OLLAMA_MODEL || __ENV.LLM_MODEL || 'llama3.2:1b',

        buildPayload(prompt, maxTokens, temperature) {
            return JSON.stringify({
                model:  this.model,
                stream: false,
                options: {
                    temperature: temperature,
                    num_predict: maxTokens,
                },
                messages: [{ role: 'user', content: prompt }],
            });
        },

        parseResponse(body) {
            const parsed = JSON.parse(body);
            return parsed.message.content.trim().toLowerCase();
        },

        headers() {
            return {
                'Content-Type': 'application/json',
            };
        },
    },

};

// ---------------------------------------------------------------------------
// Provider selector
// ---------------------------------------------------------------------------

/**
 * Returns the active provider based on the PROVIDER env variable.
 * Defaults to 'groq' if not set.
 * Throws a clear error if an unknown provider is requested.
 *
 * @returns {object} provider config object
 */
export function getProvider() {
    const key = (__ENV.PROVIDER || 'groq').toLowerCase();

    if (!PROVIDERS[key]) {
        throw new Error(
            `Unknown provider: "${key}". Available: ${Object.keys(PROVIDERS).join(' | ')}`
        );
    }

    return PROVIDERS[key];
}

/**
 * Returns all registered provider keys.
 * Useful for logging / reporting which providers are available.
 *
 * @returns {string[]}
 */
export function listProviders() {
    return Object.keys(PROVIDERS);
}