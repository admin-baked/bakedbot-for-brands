export type IntegrationProvider = 'gmail' | 'google_calendar' | 'dutchie' | 'alleaves';
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

export const INTEGRATION_METADATA: Record<string, IntegrationMetadata> = {
  gmail: {
    id: 'gmail' as IntegrationProvider,
    name: 'Gmail',
    description: 'Send emails from your Gmail account',
    icon: '📧',
    category: 'workspace',
    authMethod: 'oauth',
    setupTime: '1 minute'
  }
};
