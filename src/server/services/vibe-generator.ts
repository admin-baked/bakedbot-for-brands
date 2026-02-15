/**
 * Vibe Generator Service - Stub
 *
 * This module was extracted to a separate app. This stub exists to prevent TypeScript errors.
 * For full vibe generation, use the standalone vibe app.
 */

import type {
    VibeGenerationRequest,
    VibeGenerationResponse,
} from '@/types/vibe';

export async function generateVibe(request: VibeGenerationRequest): Promise<VibeGenerationResponse> {
    return {
        success: false,
        error: 'Vibe generator was extracted to standalone app',
    };
}

export async function refineVibe(request: VibeGenerationRequest): Promise<VibeGenerationResponse> {
    return {
        success: false,
        error: 'Vibe generator was extracted to standalone app',
    };
}
