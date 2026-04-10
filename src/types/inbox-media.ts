import type { CreativeContent, SocialPlatform } from './creative-content';

export type InboxImageStyle = 'product_photo' | 'lifestyle' | 'flat_lay' | 'menu_promo';

export type InboxVideoStyle =
    | 'educational'
    | 'trending'
    | 'behind_the_scenes'
    | 'product_showcase'
    | 'comedy';

export type InboxVideoPlatform = 'instagram' | 'tiktok' | 'youtube';

export interface InboxVideoConcept {
    title: string;
    hook: string;
    visuals: string;
    audio?: string;
    script: string;
    caption?: string;
    hashtags?: string[];
    generationPrompt: string;
}

export interface GenerateInboxImageDraftInput {
    tenantId: string;
    brandId: string;
    createdBy: string;
    platform: Extract<SocialPlatform, 'instagram' | 'tiktok' | 'linkedin' | 'facebook' | 'youtube'>;
    prompt: string;
    style: InboxImageStyle;
}

export interface GenerateInboxVideoConceptInput {
    tenantId: string;
    brandId: string;
    createdBy: string;
    prompt: string;
    style: InboxVideoStyle;
    platform: InboxVideoPlatform;
    brandName?: string;
}

export interface GenerateInboxVideoDraftInput {
    tenantId: string;
    brandId: string;
    createdBy: string;
    prompt: string;
    style: InboxVideoStyle;
    platform: InboxVideoPlatform;
    duration: '5' | '10';
    concept?: InboxVideoConcept;
    brandName?: string;
}

export interface InboxMediaDraftResult {
    success: boolean;
    draft?: CreativeContent;
    error?: string;
}
