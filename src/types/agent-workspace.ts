/**
 * Type definitions for Agent Workspace
 */

export type SetupHealthStatus = 'green' | 'yellow' | 'red';

export interface SetupHealthTile {
    status: SetupHealthStatus;
    message: string;
    action: string; // playbook ID or action to trigger
}

export interface SetupHealth {
    dataConnected: SetupHealthTile;
    publishingLive: SetupHealthTile;
    complianceReady: SetupHealthTile;
    deliveryChannels: SetupHealthTile;
}

export type TaskStatus = 'running' | 'needs_approval' | 'completed' | 'failed';

export interface Task {
    taskId: string;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
    status: TaskStatus;
    type: string; // 'menu_generation', 'brand_audit', 'footprint_analysis', etc.
    title: string;
    steps?: string[];
    currentStep?: number;
    artifacts?: TaskArtifact[];
    approvalRequired: boolean;
    approvalData?: ApprovalData;
}

export interface TaskArtifact {
    label: string;
    url: string;
    type: 'link' | 'file' | 'report';
}

export interface ApprovalData {
    actionType: 'publish_menu' | 'send_email' | 'send_sms' | 'enable_monitoring';
    details: any;
    deeboCheckId?: string;
    deeboResult?: 'pass' | 'warn' | 'fail';
    estimatedUsage: {
        intelRuns?: number;
        deeboChecks?: number;
        marketSensors?: number;
    };
    riskFlags?: string[];
}

export interface QuickStartCard {
    id: string;
    title: string;
    description: string;
    icon: string;
    estimatedTime: string; // "10 min", "5 min"
    playbookId?: string; // References playbook from data.ts
    prompt?: string; // Direct prompt to send to chat
    roles: ('brand' | 'dispensary')[]; // Which roles see this card
}

export type UserRole = 'brand' | 'dispensary' | 'owner' | 'customer';
