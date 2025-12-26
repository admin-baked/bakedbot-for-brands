
/**
 * pure helper to detect if a message is requesting media generation.
 * Isolated for easier unit testing.
 */

export type MediaType = 'image' | 'video' | null;

export function detectMediaRequest(userMessage: string): MediaType {
    const lowerMessage = userMessage.toLowerCase();

    // Video Detection
    if (
        lowerMessage.includes('generate video') || 
        lowerMessage.includes('create a video') || 
        lowerMessage.includes('make a video') || 
        (lowerMessage.includes('video') && lowerMessage.includes('generate'))
    ) {
        return 'video';
    }

    // Image Detection
    if (
        lowerMessage.includes('generate image') || 
        lowerMessage.includes('create an image') || 
        lowerMessage.includes('picture of') || 
        (lowerMessage.includes('image') && lowerMessage.includes('generate'))
    ) {
        return 'image';
    }

    return null;
}
