/**
 * PowerPoint / Deck Generation Types
 */

export type DeckPurpose = 'pitch' | 'menu' | 'training' | 'campaign';

export interface GeneratePowerPointInput {
    topic: string;
    brandName?: string;
    brandTagline?: string;
    primaryColor?: string;
    accentColor?: string;
    logoUrl?: string;
    purpose: DeckPurpose;
    slideCount?: number; // 3–10, default 6
    orgId?: string;
}

export interface SlideScript {
    title: string;
    bullets: string[];
    speakerNotes?: string;
}

export interface DeckScript {
    deckTitle: string;
    subtitle?: string;
    slides: SlideScript[];
    disclaimer?: string;
}

export interface GeneratePowerPointOutput {
    downloadUrl: string;
    fileName: string;
    slideCount: number;
    purpose: DeckPurpose;
    generatedBy: 'pptxgenjs';
}
