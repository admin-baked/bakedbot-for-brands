/**
 * OpenClaw Service Type Definitions
 *
 * TypeScript interfaces for WhatsApp gateway integration.
 */

export interface SessionStatus {
    connected: boolean;
    phoneNumber?: string;
    lastConnected?: string;
    qrRequired: boolean;
}

export interface SendMessageRequest {
    to: string; // Phone number (international format: +1234567890)
    message: string;
    mediaUrl?: string; // Optional image/video URL
}

export interface SendMessageResult {
    messageId: string;
    status: 'sent' | 'pending' | 'failed';
    timestamp: string;
}

export interface MessageHistoryRequest {
    phoneNumber?: string; // Filter by contact
    limit?: number; // Default: 50
    offset?: number; // Pagination
}

export interface MessageHistoryResult {
    messages: WhatsAppMessage[];
    total: number;
}

export interface WhatsAppMessage {
    id: string;
    from: string;
    to: string;
    message: string;
    mediaUrl?: string;
    timestamp: string;
    status: 'sent' | 'delivered' | 'read' | 'failed';
}

export interface CampaignResult {
    total: number;
    sent: number;
    failed: number;
    errors: string[];
}
