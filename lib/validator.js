/**
 * lib/validator.js
 * 
 * Test data validation at startup - fail fast if test data is invalid.
 */

export class ValidationError extends Error {
    constructor(message, field, value) {
        super(message);
        this.name = 'ValidationError';
        this.field = field;
        this.value = value;
    }
}

export function validateTestData(testData, dataType) {
    const errors = [];
    
    if (!Array.isArray(testData)) {
        throw new ValidationError(`${dataType} must be an array`, 'type', typeof testData);
    }
    
    if (testData.length === 0) {
        throw new ValidationError(`${dataType} cannot be empty`, 'length', 0);
    }
    
    testData.forEach((item, index) => {
        if (typeof item !== 'object' || item === null) {
            errors.push(`Item at index ${index} must be an object`);
            return;
        }
        
        if (!item.prompt || typeof item.prompt !== 'string') {
            errors.push(`Item at index ${index} missing valid 'prompt' string`);
        }
        
        if (item.expected === undefined) {
            errors.push(`Item at index ${index} missing 'expected' field`);
        }
        
        if (item.type && typeof item.type !== 'string') {
            errors.push(`Item at index ${index} 'type' must be a string`);
        }
    });
    
    if (errors.length > 0) {
        throw new ValidationError(`${dataType} validation failed: ${errors.join(', ')}`, 'errors', errors);
    }
    
    return true;
}

export function validatePrompts(prompts) {
    if (!Array.isArray(prompts)) {
        throw new ValidationError('PERFORMANCE_PROMPTS must be an array', 'type', typeof prompts);
    }
    
    if (prompts.length === 0) {
        throw new ValidationError('PERFORMANCE_PROMPTS cannot be empty', 'length', 0);
    }
    
    prompts.forEach((prompt, index) => {
        if (typeof prompt !== 'string') {
            throw new ValidationError(`Prompt at index ${index} must be a string`, 'type', typeof prompt);
        }
        if (prompt.trim().length === 0) {
            throw new ValidationError(`Prompt at index ${index} cannot be empty`, 'prompt', prompt);
        }
    });
    
    return true;
}

export function validateConfig(config) {
    const requiredFields = ['apiUrl', 'model'];
    const missingFields = requiredFields.filter(field => !config[field]);
    
    if (missingFields.length > 0) {
        throw new ValidationError(`CONFIG missing required fields: ${missingFields.join(', ')}`, 'missing', missingFields);
    }
    
    if (config.apiKey && typeof config.apiKey !== 'string') {
        throw new ValidationError('CONFIG.apiKey must be a string', 'apiKey', typeof config.apiKey);
    }
    
    return true;
}

export function validateAll(prompts, qualityChecks, consistencyChecks, config) {
    const results = {
        prompts: validatePrompts(prompts),
        qualityChecks: validateTestData(qualityChecks, 'QUALITY_CHECKS'),
        consistencyChecks: validateTestData(consistencyChecks, 'CONSISTENCY_CHECKS'),
        config: validateConfig(config),
    };
    
    return results;
}
