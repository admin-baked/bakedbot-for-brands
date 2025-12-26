
// dev/diagnose-veo.ts
import { config } from 'dotenv';
config({ path: '.env.local' });

// Mock server-only before it gets imported by any dependency
import { generateVideoFromPrompt } from '../src/ai/flows/generate-video';

// We need to bypass the fact that generate-video imports genkit which imports server-only.
// Since we can't easily mock imports in ESM without loaders, we will instead 
// use a specialized require-hook or just replicate the logic we need here.
// Replicating logic is safer.

import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

async function testVeoStandalone() {
    console.log('🧪 Starting Veo 3.1 Diagnostics (Standalone Mode)...');
    
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        console.error('❌ Missing GEMINI_API_KEY or GOOGLE_API_KEY in .env.local');
        return;
    }

    const ai = genkit({
        plugins: [googleAI({ apiKey })],
        model: 'googleai/gemini-2.0-flash-exp' // default for agent, but we call veo specifically
    });

    // Reconstruct the logic from generate-video.ts locally to avoid importing 'server-only'
    const GenerateVideoInputSchema = z.object({
        prompt: z.string(),
        duration: z.enum(['5', '10']).optional().default('5'),
        aspectRatio: z.enum(['16:9', '9:16', '1:1']).optional().default('16:9'),
    });

    const videoPrompt = ai.definePrompt({
        name: 'testVeo',
        input: { schema: GenerateVideoInputSchema },
        prompt: `Generate a video. Request: {{{prompt}}}`,
        model: 'googleai/veo-3.0-generate-001', // Target Model
    });

    try {
        const promptText = "A cinematic drone shot of a cannabis farm at sunset, 4k resolution";
        console.log(`\n🚀 Sending Prompt: "${promptText}"`);
        console.log('Model: googleai/veo-3.0-generate-001');
        
        const response = await videoPrompt({
            prompt: promptText,
            duration: '5',
            aspectRatio: '16:9'
        });

        console.log('\n[Raw Response]:', JSON.stringify(response, null, 2));

        if (response.media) {
             console.log('\n✅ Success! Video URL:', response.media.url);
        } else {
             console.log('\n⚠️ No media returned.');
             if (response.text) console.log('Text content:', response.text);
        }

    } catch (error: any) {
        console.error('\n❌ FAILURE');
        console.error('Error Message:', error.message);
        // Print full error implementation details to see 403/404
        if (error.status) console.error('Status:', error.status);
        if (error.details) console.error('Details:', JSON.stringify(error.details, null, 2));
    }
}

testVeoStandalone();
