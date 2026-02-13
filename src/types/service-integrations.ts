export type IntegrationProvider =
  | 'gmail'
  | 'google_calendar'
  | 'google_drive'
  | 'google_sheets'
  | 'dutchie'
  | 'alleaves'
  | 'mailchimp';

export type IntegrationAuthMethod = 'oauth' | 'api_key' | 'jwt';
export type IntegrationCategory = 'workspace' | 'pos' | 'marketing';
export type IntegrationStatus = 'connected' | 'disconnected' | 'error' | 'expired';

export interface IntegrationRequest {
  provider: IntegrationProvider;
  reason: string;
  authMethod: IntegrationAuthMethod;
  category: IntegrationCategory;
  setupTime?: string;
  threadId?: string;
  enablesAction?: string;
}

export interface IntegrationMetadata {
  id: IntegrationProvider;
  name: string;
  description: string;
  icon: string;
  category: IntegrationCategory;
  authMethod: IntegrationAuthMethod;
  setupTime: string;
}

export const INTEGRATION_METADATA: Record<IntegrationProvider, IntegrationMetadata> = {
  gmail: {
    id: 'gmail',
    name: 'Gmail',
    description: 'Send and read emails from your personal Gmail account',
    icon: 'email',
    category: 'workspace',
    authMethod: 'oauth',
    setupTime: '1 minute',
  },
  google_calendar: {
    id: 'google_calendar',
    name: 'Google Calendar',
    description: 'Create and manage calendar events',
    icon: 'calendar',
    category: 'workspace',
    authMethod: 'oauth',
    setupTime: '1 minute',
  },
  google_drive: {
    id: 'google_drive',
    name: 'Google Drive',
    description: 'Access and manage files in Drive',
    icon: 'drive',
    category: 'workspace',
    authMethod: 'oauth',
    setupTime: '1 minute',
  },
  google_sheets: {
    id: 'google_sheets',
    name: 'Google Sheets',
    description: 'Create and edit spreadsheets',
    icon: 'sheets',
    category: 'workspace',
    authMethod: 'oauth',
    setupTime: '1 minute',
  },
  dutchie: {
    id: 'dutchie',
    name: 'Dutchie',
    description: 'Connect your Dutchie menu for product sync',
    icon: 'pos',
    category: 'pos',
    authMethod: 'api_key',
    setupTime: '3 minutes',
  },
  alleaves: {
    id: 'alleaves',
    name: 'Alleaves',
    description: 'Sync inventory and orders from Alleaves POS',
    icon: 'pos',
    category: 'pos',
    authMethod: 'jwt',
    setupTime: '3 minutes',
  },
  mailchimp: {
    id: 'mailchimp',
    name: 'Mailchimp',
    description: 'Sync segments and send email campaigns',
    icon: 'email',
    category: 'marketing',
    authMethod: 'api_key',
    setupTime: '3 minutes',
  },
};

