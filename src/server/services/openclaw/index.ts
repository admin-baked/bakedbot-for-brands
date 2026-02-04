/**
 * OpenClaw Service - WhatsApp Gateway
 *
 * Public exports for WhatsApp integration.
 */

// Client
export {
    getOpenClawClient,
    isOpenClawAvailable,
    OpenClawClient,
    type OpenClawConfig,
    type OpenClawResponse,
} from './client';

// Gateway Operations
export {
    getSessionStatus,
    generateQRCode,
    disconnectSession,
    sendMessage,
    getMessageHistory,
} from './gateway';

// Campaign Manager
export {
    sendCampaign,
    type CampaignConfig,
} from './campaigns';

// Types
export type {
    SessionStatus,
    SendMessageRequest,
    SendMessageResult,
    MessageHistoryRequest,
    MessageHistoryResult,
    WhatsAppMessage,
    CampaignResult,
} from './types';
