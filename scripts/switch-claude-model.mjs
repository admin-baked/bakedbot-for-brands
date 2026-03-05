import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * switch-claude-model.mjs
 * 
 * A utility to switch between different GLM models or official Anthropic models
 * in the global Claude Code settings AND the local .env.local file.
 */

const CLAUDE_SETTINGS_PATH = path.join(os.homedir(), '.claude', 'settings.json');
const ENV_LOCAL_PATH = path.join(process.cwd(), '.env.local');

const MODELS = {
    'glm-4.7': {
        ANTHROPIC_BASE_URL: 'https://api.z.ai/api/anthropic',
        ANTHROPIC_DEFAULT_OPUS_MODEL: 'glm-4.7',
        ANTHROPIC_DEFAULT_SONNET_MODEL: 'glm-4.7',
        ANTHROPIC_DEFAULT_HAIKU_MODEL: 'glm-4.5-air',
        CLAUDE_TOOL_MODEL: 'glm-4.7',
        CLAUDE_REASONING_MODEL: 'glm-4.7'
    },
    'glm-5': {
        ANTHROPIC_BASE_URL: 'https://api.z.ai/api/anthropic',
        ANTHROPIC_DEFAULT_OPUS_MODEL: 'glm-5',
        ANTHROPIC_DEFAULT_SONNET_MODEL: 'glm-5',
        ANTHROPIC_DEFAULT_HAIKU_MODEL: 'glm-4.5-air',
        CLAUDE_TOOL_MODEL: 'glm-5',
        CLAUDE_REASONING_MODEL: 'glm-5'
    },
    'glm-4.5-air': {
        ANTHROPIC_BASE_URL: 'https://api.z.ai/api/anthropic',
        ANTHROPIC_DEFAULT_OPUS_MODEL: 'glm-4.5-air',
        ANTHROPIC_DEFAULT_SONNET_MODEL: 'glm-4.5-air',
        ANTHROPIC_DEFAULT_HAIKU_MODEL: 'glm-4.5-air',
        CLAUDE_TOOL_MODEL: 'glm-4.5-air',
        CLAUDE_REASONING_MODEL: 'glm-4.5-air'
    },
    'anthropic': {
        ANTHROPIC_BASE_URL: '', // Reset to direct Anthropic
        ANTHROPIC_DEFAULT_OPUS_MODEL: 'claude-3-opus-20240229',
        ANTHROPIC_DEFAULT_SONNET_MODEL: 'claude-3-5-sonnet-20241022',
        ANTHROPIC_DEFAULT_HAIKU_MODEL: 'claude-3-5-haiku-20241022',
        CLAUDE_TOOL_MODEL: 'claude-3-5-sonnet-20241022',
        CLAUDE_REASONING_MODEL: 'claude-3-opus-20240229'
    }
};

function updateEnvLocal(config) {
    if (!fs.existsSync(ENV_LOCAL_PATH)) {
        console.log(`⚠️ .env.local not found at ${ENV_LOCAL_PATH}. Skipping project-level update.`);
        return;
    }

    let envContent = fs.readFileSync(ENV_LOCAL_PATH, 'utf8');
    let lines = envContent.split('\n');

    Object.entries(config).forEach(([key, value]) => {
        const index = lines.findIndex(line => line.startsWith(`${key}=`));
        if (index !== -1) {
            lines[index] = `${key}=${value}`;
        } else if (value) {
            lines.push(`${key}=${value}`);
        }
    });

    fs.writeFileSync(ENV_LOCAL_PATH, lines.join('\n'), 'utf8');
    console.log(`✅ Updated .env.local with ${Object.keys(config).length} variables.`);
}

async function switchModel() {
    const target = process.argv[2] || 'glm-4.7';

    if (!MODELS[target]) {
        console.error(`❌ Invalid model: ${target}`);
        console.log(`Available options: ${Object.keys(MODELS).join(', ')}`);
        process.exit(1);
    }

    const config = MODELS[target];

    // 1. Update Global Claude Settings
    if (fs.existsSync(CLAUDE_SETTINGS_PATH)) {
        try {
            const rawData = fs.readFileSync(CLAUDE_SETTINGS_PATH, 'utf8');
            const settings = JSON.parse(rawData);

            if (!settings.env) settings.env = {};

            Object.keys(config).forEach(key => {
                if (config[key]) {
                    settings.env[key] = config[key];
                } else {
                    delete settings.env[key];
                }
            });

            fs.writeFileSync(CLAUDE_SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf8');
            console.log(`✅ Updated Global Claude Settings: ${CLAUDE_SETTINGS_PATH}`);
        } catch (err) {
            console.error(`❌ Error updating global settings: ${err.message}`);
        }
    } else {
        console.log(`⚠️ Global Settings not found at ${CLAUDE_SETTINGS_PATH}. Skipping CLI update.`);
    }

    // 2. Update Project .env.local
    updateEnvLocal(config);

    console.log(`\n🎉 Switched to: ${target.toUpperCase()}`);
    console.log('---------------------------');
    console.log('Please restart your Claude Code session AND your local dev server.');
}

switchModel();
