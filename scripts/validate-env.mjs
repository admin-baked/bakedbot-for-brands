#!/usr/bin/env node

/**
 * Environment Validation Script
 * Validates all required environment variables are set
 * Run before deployment to catch configuration issues early
 */

import { logger } from '../src/lib/logger.js';

// Environment variable definitions
const ENV_VARS = {
    // Critical - Required for all environments
    CRITICAL: [
        { key: 'FIREBASE_SERVICE_ACCOUNT_KEY', description: 'Firebase Admin SDK credentials (Base64 encoded JSON)' },
        { key: 'NEXT_PUBLIC_FIREBASE_API_KEY', description: 'Firebase client API key' },
        { key: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID', description: 'Firebase project ID' },
    ],

    // Required - Must be set for production
    REQUIRED: [
        { key: 'SENDGRID_API_KEY', description: 'SendGrid email service API key' },
        { key: 'SENDGRID_FROM_EMAIL', description: 'SendGrid sender email address' },
        { key: 'RECAPTCHA_SECRET_KEY', description: 'reCAPTCHA v3 secret key' },
        { key: 'CLAUDE_API_KEY', description: 'Anthropic Claude API key for AI features' },
        { key: 'CANNMENUS_API_KEY', description: 'CannMenus API key for menu data' },
        { key: 'SENTRY_DSN', description: 'Sentry error tracking DSN' },
    ],

    // Payment Processing - At least one required
    PAYMENT: [
        { key: 'CANPAY_APP_KEY', description: 'CannPay application key' },
        { key: 'CANPAY_API_SECRET', description: 'CannPay API secret' },
        { key: 'STRIPE_SECRET_KEY', description: 'Stripe secret key' },
        { key: 'STRIPE_WEBHOOK_SECRET', description: 'Stripe webhook signing secret' },
    ],

    // Optional - Nice to have but not critical
    OPTIONAL: [
        { key: 'GOOGLE_SEARCH_API_KEY', description: 'Google Search API key' },
        { key: 'GOOGLE_CUSTOM_SEARCH_ENGINE_ID', description: 'Google Custom Search Engine ID' },
        { key: 'GOOGLE_SHEETS_API_KEY', description: 'Google Sheets API key' },
        { key: 'SMOKEY_PAY_API_KEY', description: 'SmokeyPay API key' },
        { key: 'BLACKLEAF_API_KEY', description: 'BlackLeaf SMS API key' },
    ],
};

// Configuration defaults
const CONFIG_VARS = {
    REQUIRED: [
        { key: 'SENDGRID_FROM_NAME', defaultValue: 'BakedBot', description: 'SendGrid sender name' },
        { key: 'CANNMENUS_API_BASE', defaultValue: 'https://api.cannmenus.com', description: 'CannMenus API base URL' },
        { key: 'AUTHNET_ENV', defaultValue: 'sandbox', description: 'Authorize.Net environment (sandbox/production)' },
        { key: 'BLACKLEAF_BASE_URL', defaultValue: 'https://api.blackleaf.io', description: 'BlackLeaf API base URL' },
        { key: 'CANPAY_MODE', defaultValue: 'test', description: 'CannPay mode (test/live)' },
        { key: 'NEXT_PUBLIC_DEV_AUTH_BYPASS', defaultValue: 'false', description: 'Dev auth bypass (MUST be false in production)' },
    ],
};

class ValidationResult {
    constructor() {
        this.critical = { missing: [], invalid: [] };
        this.required = { missing: [], invalid: [] };
        this.payment = { missing: [], invalid: [] };
        this.optional = { missing: [] };
        this.config = { missing: [], usingDefaults: [] };
        this.warnings = [];
    }

    get hasErrors() {
        return this.critical.missing.length > 0 ||
            this.critical.invalid.length > 0 ||
            this.required.missing.length > 0 ||
            this.required.invalid.length > 0;
    }

    get hasCriticalErrors() {
        return this.critical.missing.length > 0 || this.critical.invalid.length > 0;
    }
}

/**
 * Validate a single environment variable
 */
function validateEnvVar(key, description) {
    const value = process.env[key];

    if (!value || value.trim() === '') {
        return { valid: false, reason: 'Not set or empty' };
    }

    // Additional validation based on key type
    if (key.includes('API_KEY') || key.includes('SECRET')) {
        if (value.length < 10) {
            return { valid: false, reason: 'Too short (< 10 chars)' };
        }
    }

    if (key.includes('EMAIL')) {
        if (!value.includes('@')) {
            return { valid: false, reason: 'Invalid email format' };
        }
    }

    if (key.includes('URL') || key.includes('BASE')) {
        if (!value.startsWith('http')) {
            return { valid: false, reason: 'Invalid URL format' };
        }
    }

    if (key === 'FIREBASE_SERVICE_ACCOUNT_KEY') {
        // Check if it's base64
        try {
            const decoded = Buffer.from(value, 'base64').toString();
            JSON.parse(decoded);
        } catch {
            return { valid: false, reason: 'Invalid Base64 JSON format' };
        }
    }

    return { valid: true };
}

/**
 * Check config variables and apply defaults
 */
function checkConfigVars(result) {
    for (const { key, defaultValue, description } of CONFIG_VARS.REQUIRED) {
        const value = process.env[key];

        if (!value || value.trim() === '') {
            result.config.usingDefaults.push({ key, value: defaultValue, description });

            // Special check for production-critical configs
            if (key === 'NEXT_PUBLIC_DEV_AUTH_BYPASS' && process.env.NODE_ENV === 'production') {
                if (!value) {
                    result.warnings.push(`⚠️  ${key} not set - defaulting to "false" (VERIFY this is correct for production)`);
                } else if (value !== 'false') {
                    result.critical.invalid.push({ key, reason: 'MUST be "false" in production!', description });
                }
            }
        }
    }
}

/**
 * Check payment provider configuration
 */
function checkPaymentVars(result) {
    const cannPaySet = process.env.CANPAY_APP_KEY && process.env.CANPAY_API_SECRET;
    const stripeSet = process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET;

    if (!cannPaySet && !stripeSet) {
        result.required.missing.push({
            key: 'PAYMENT_PROVIDER',
            description: 'At least one payment provider (CannPay OR Stripe) must be configured',
        });
    } else {
        if (cannPaySet) {
            logger.info('✅ CannPay payment provider configured');
        }
        if (stripeSet) {
            logger.info('✅ Stripe payment provider configured');
        }
    }

    // Check individual payment vars
    for (const { key, description } of ENV_VARS.PAYMENT) {
        const validation = validateEnvVar(key, description);
        if (!validation.valid) {
            result.payment.missing.push({ key, reason: validation.reason, description });
        }
    }
}

/**
 * Main validation function
 */
function validateEnvironment() {
    const result = new ValidationResult();
    const isProduction = process.env.NODE_ENV === 'production';

    logger.info('🔍 Starting environment validation...');
    logger.info(`   Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
    logger.info('');

    // Check critical variables
    logger.info('📌 Checking CRITICAL variables...');
    for (const { key, description } of ENV_VARS.CRITICAL) {
        const validation = validateEnvVar(key, description);
        if (!validation.valid) {
            result.critical.missing.push({ key, reason: validation.reason, description });
            logger.error(`   ❌ ${key}: ${validation.reason}`);
        } else {
            logger.info(`   ✅ ${key}`);
        }
    }

    // Check required variables
    logger.info('');
    logger.info('📋 Checking REQUIRED variables...');
    for (const { key, description } of ENV_VARS.REQUIRED) {
        const validation = validateEnvVar(key, description);
        if (!validation.valid) {
            result.required.missing.push({ key, reason: validation.reason, description });
            logger.warn(`   ⚠️  ${key}: ${validation.reason}`);
        } else {
            logger.info(`   ✅ ${key}`);
        }
    }

    // Check payment variables
    logger.info('');
    logger.info('💳 Checking PAYMENT variables...');
    checkPaymentVars(result);

    // Check optional variables
    logger.info('');
    logger.info('🔧 Checking OPTIONAL variables...');
    for (const { key, description } of ENV_VARS.OPTIONAL) {
        const validation = validateEnvVar(key, description);
        if (!validation.valid) {
            result.optional.missing.push({ key, description });
            logger.debug(`   ℹ️  ${key}: Not configured (optional)`);
        } else {
            logger.info(`   ✅ ${key}`);
        }
    }

    // Check config defaults
    logger.info('');
    logger.info('⚙️  Checking CONFIGURATION...');
    checkConfigVars(result);

    for (const { key, value } of result.config.usingDefaults) {
        logger.info(`   🔵 ${key}: Using default "${value}"`);
    }

    return result;
}

/**
 * Print validation summary
 */
function printSummary(result) {
    const isProduction = process.env.NODE_ENV === 'production';

    logger.info('\n' + '='.repeat(60));
    logger.info('VALIDATION SUMMARY');
    logger.info('='.repeat(60));

    if (result.hasErrors) {
        logger.error('\n❌ VALIDATION FAILED\n');

        if (result.critical.missing.length > 0) {
            logger.error('🚨 CRITICAL Issues:');
            for (const { key, reason, description } of result.critical.missing) {
                logger.error(`   ${key}: ${reason}`);
                logger.error(`   → ${description}`);
            }
        }

        if (result.required.missing.length > 0) {
            logger.error('\n⚠️  REQUIRED Issues:');
            for (const { key, reason, description } of result.required.missing) {
                logger.error(`   ${key}: ${reason}`);
                logger.error(`   → ${description}`);
            }
        }

        logger.info('\n📝 To fix:');
        logger.info('   1. Add missing variables to .env.local (development)');
        logger.info('   2. Add missing secrets to Google Secret Manager (production)');
        logger.info('   3. Update apphosting.yaml to bind secrets');

    } else {
        logger.info('\n✅ VALIDATION PASSED\n');
        logger.info('All required environment variables are configured correctly.');

        if (result.optional.missing.length > 0) {
            logger.info(`\nℹ️  ${result.optional.missing.length} optional variable(s) not configured (OK for basic functionality)`);
        }
    }

    if (result.warnings.length > 0) {
        logger.warn('\n⚠️  WARNINGS:');
        for (const warning of result.warnings) {
            logger.warn(`   ${warning}`);
        }
    }

    logger.info('\n' + '='.repeat(60) + '\n');
}

/**
 * Main execution
 */
function main() {
    const result = validateEnvironment();
    printSummary(result);

    // Exit with appropriate code
    if (result.hasCriticalErrors) {
        logger.error('💀 Critical errors found. Cannot proceed.');
        process.exit(1);
    } else if (result.hasErrors && process.env.NODE_ENV === 'production') {
        logger.error('🛑 Required variables missing in production. Cannot proceed.');
        process.exit(1);
    } else if (result.hasErrors) {
        logger.warn('⚠️  Some required variables missing, but OK for development.');
        process.exit(0); // Allow dev to continue
    } else {
        logger.info('🚀 Environment validated successfully!');
        process.exit(0);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { validateEnvironment, ValidationResult };
