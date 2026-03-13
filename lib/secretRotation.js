/**
 * lib/secretRotation.js
 * 
 * Secret Rotation - Google SDET standard.
 * Handles multiple API keys with automatic rotation on rate limits.
 */

import { logger } from './logger.js';

export class SecretRotation {
    constructor(keys, options = {}) {
        this.keys = Array.isArray(keys) ? keys : [keys];
        this.currentIndex = 0;
        this.rotationStrategy = options.strategy || 'round-robin';
        this.failedKeys = new Set();
        
        if (options.shuffle !== false) {
            this.shuffleKeys();
        }
    }

    shuffleKeys() {
        for (let i = this.keys.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.keys[i], this.keys[j]] = [this.keys[j], this.keys[i]];
        }
    }

    getCurrentKey() {
        return this.keys[this.currentIndex];
    }

    rotate() {
        const previousIndex = this.currentIndex;
        
        if (this.rotationStrategy === 'round-robin') {
            this.currentIndex = (this.currentIndex + 1) % this.keys.length;
        } else if (this.rotationStrategy === 'random') {
            this.currentIndex = Math.floor(Math.random() * this.keys.length);
        }
        
        if (previousIndex !== this.currentIndex) {
            logger.info('Rotated API key', { 
                from: previousIndex + 1, 
                to: this.currentIndex + 1,
                totalKeys: this.keys.length,
            });
        }
        
        return this.getCurrentKey();
    }

    markFailed(key) {
        this.failedKeys.add(key);
        logger.warn('API key marked as failed', { failedKeys: this.failedKeys.size });
        
        if (this.failedKeys.size >= this.keys.length) {
            logger.error('All API keys have failed');
            throw new Error('All API keys exhausted');
        }
    }

    markSuccess(key) {
        if (this.failedKeys.has(key)) {
            this.failedKeys.delete(key);
            logger.info('API key recovered', { availableKeys: this.keys.length - this.failedKeys.size });
        }
    }

    getAvailableKeys() {
        return this.keys.filter(k => !this.failedKeys.has(k));
    }

    reset() {
        this.failedKeys.clear();
        this.currentIndex = 0;
    }
}

let secretRotationInstance = null;

export const initSecretRotation = (keys, options) => {
    if (!secretRotationInstance) {
        secretRotationInstance = new SecretRotation(keys, options);
    }
    return secretRotationInstance;
};

export const getSecretRotation = () => secretRotationInstance;

export const getCurrentApiKey = () => {
    if (secretRotationInstance) {
        return secretRotationInstance.getCurrentKey();
    }
    return __ENV.GROQ_API_KEY;
};
