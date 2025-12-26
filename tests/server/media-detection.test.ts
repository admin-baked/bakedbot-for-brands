
import { detectMediaRequest } from '@/server/agents/tools/media-detection';

describe('Media Detection Logic', () => {
    
    // Video Tests
    test('detects explicit video generation requests', () => {
        expect(detectMediaRequest('Generate a video of a running leaf')).toBe('video');
        expect(detectMediaRequest('Create a video for marketing')).toBe('video');
        expect(detectMediaRequest('Make a video about cats')).toBe('video');
        // New user reported case
        expect(detectMediaRequest('create video of man running')).toBe('video');
    });

    test('detects split keywords for video', () => {
        expect(detectMediaRequest('Can you generate a cool marketing video?')).toBe('video');
    });

    // Image Tests
    test('detects explicit image generation requests', () => {
        expect(detectMediaRequest('Generate an image of a store')).toBe('image');
        expect(detectMediaRequest('Create an image for Instagram')).toBe('image');
        expect(detectMediaRequest('Show me a picture of a bud')).toBe('image');
    });

    test('detects split keywords for image', () => {
        expect(detectMediaRequest('Generate a hyper-realistic image')).toBe('image');
    });

    // Negative Tests
    test('ignores general queries', () => {
        expect(detectMediaRequest('What is the best video strategy?')).toBeNull();
        expect(detectMediaRequest('Do you like images?')).toBeNull();
        expect(detectMediaRequest('Analyze the image data')).toBeNull();
    });

    // Priority Test
    test('prioritizes video over image if ambiguous (though logic is sequential)', () => {
        // Current logic checks video first.
        // "Generate a video from this image" -> should be video
        expect(detectMediaRequest('Generate a video from this image')).toBe('video');
    });
});
