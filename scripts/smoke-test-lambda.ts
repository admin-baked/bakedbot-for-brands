import { generateRemotionVideo } from '../src/ai/generators/remotion-video';

async function runTest() {
    console.log('📦 Imports resolved successfully.');
    console.log('🚀 Triggering Lambda smoke test...');
    
    try {
        const siteName = process.argv[2] || 'bakedbot-creative';
        const serveUrl = `s3://remotionlambda-useast1-5hg2s7ajg0/sites/${siteName}/index.html`;
        const result = await generateRemotionVideo({
            prompt: 'SMOKE TEST RENDER',
            compositionId: 'TinySmokeTest',
            props: {
                title: 'Infrastructure Verified!',
                subtitle: 'Remotion Lambda is LIVE in us-east-1',
                videoUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1280&q=80',
                overlayImage: 'https://bakedbot.ai/logo.png',
            },
            serveUrl,
        });
        console.log('✅ Render Success!');
        console.log('🔗 Video URL:', result.videoUrl);
        process.exit(0);
    } catch (error) {
        console.error('❌ Render Failed:', error);
        process.exit(1);
    }
}

runTest();
