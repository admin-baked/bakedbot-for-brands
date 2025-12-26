
import { config } from 'dotenv';
config({ path: '.env.local' });

// Standalone script to list models
// We use the underlying google cloud fetch or genkit discovery if possible.
// Easiest is to use the SDK directly if available, or just raw fetch.

const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

if (!API_KEY) {
    console.error('❌ Missing API Key');
    process.exit(1);
}

async function listModels() {
    console.log('🔍 Listing Available Models...');
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        const models = data.models || [];
        
        console.log(`\nFound ${models.length} models.`);
        
        // Filter for video models
        const videoModels = models.filter((m: any) => 
            m.name.includes('veo') || 
            m.name.includes('video') ||
            m.supportedGenerationMethods?.includes('predictLongRunning') // Veo often uses this
        );

        if (videoModels.length > 0) {
            console.log('\n📹 Video Generation Models:');
            videoModels.forEach((m: any) => {
                console.log(`- ${m.name.replace('models/', '')}`);
                console.log(`  Methods: ${m.supportedGenerationMethods?.join(', ')}`);
            });
        } else {
            console.log('\n⚠️ No obvious video/veo models found in list.');
            console.log('Listing ALL models for manual check:');
            models.forEach((m: any) => console.log(`- ${m.name}`));
        }

    } catch (error: any) {
        console.error('Failed to list models:', error.message);
    }
}

listModels();
