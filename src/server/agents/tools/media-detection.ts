
/**
 * pure helper to detect if a message is requesting media generation.
 * Isolated for easier unit testing.
 */

export type MediaType = 'image' | 'video' | null;

export function detectMediaRequest(userMessage: string): MediaType {
    const lowerMessage = userMessage.toLowerCase();

    // Video Detection
    // Matches: "generate video", "create video", "create a video", "make a video", "make video"
    if (
        lowerMessage.includes('generate video') || 
        lowerMessage.includes('create video') || 
        lowerMessage.includes('create a video') || 
        lowerMessage.includes('make a video') || 
        lowerMessage.includes('make video') ||
        (lowerMessage.includes('video') && lowerMessage.includes('generate'))
    ) {
        return 'video';
    }

    // Image Detection
    // Matches: "generate image", "create image", "create an image", "picture of"
    if (
        lowerMessage.includes('generate image') || 
        lowerMessage.includes('create image') || 
        lowerMessage.includes('create an image') || 
        lowerMessage.includes('picture of') || 
        lowerMessage.includes('show me an image') ||
        (lowerMessage.includes('image') && lowerMessage.includes('generate'))
    ) {
        return 'image';
    }

    return null;
}
