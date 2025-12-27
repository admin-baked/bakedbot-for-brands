
/**
 * pure helper to detect if a message is requesting media generation.
 * Isolated for easier unit testing.
 */

export type MediaType = 'image' | 'video' | null;

export function detectMediaRequest(userMessage: string): MediaType {
    const lowerMessage = userMessage.toLowerCase();

    // Video Detection - expanded patterns
    // Matches: "generate video", "create a X video", "make a video", "cartoon video", etc.
    const videoKeywords = ['video', 'animation', 'clip', 'commercial', 'ad'];
    const actionKeywords = ['create', 'generate', 'make', 'produce', 'build'];
    
    const hasVideoWord = videoKeywords.some(kw => lowerMessage.includes(kw));
    const hasActionWord = actionKeywords.some(kw => lowerMessage.includes(kw));
    
    // If both video-like word AND action word exist, it's a video request
    if (hasVideoWord && hasActionWord) {
        return 'video';
    }

    // Image Detection - expanded patterns
    const imageKeywords = ['image', 'picture', 'photo', 'poster', 'banner', 'graphic', 'infographic'];
    const hasImageWord = imageKeywords.some(kw => lowerMessage.includes(kw));
    
    if ((hasImageWord && hasActionWord) || lowerMessage.includes('show me an image')) {
        return 'image';
    }

    return null;
}
