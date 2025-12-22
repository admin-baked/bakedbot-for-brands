/**
 * Data Job Types
 * Background jobs for async data import and processing
 */

export type DataJobType =
    | 'product_sync'
    | 'dispensary_import'
    | 'seo_page_generation'
    | 'competitor_discovery'
    | 'brand_discovery';

export type DataJobStatus = 'pending' | 'running' | 'complete' | 'error';

export interface DataJob {
    id: string;
    type: DataJobType;
    entityId: string;
    entityName: string;
    entityType: 'brand' | 'dispensary';
    orgId: string;
    userId: string;
    status: DataJobStatus;
    message: string;
    progress: number; // 0-100
    error?: string;
    createdAt: Date;
    updatedAt: Date;
    startedAt?: Date;
    completedAt?: Date;
    attempts: number;
    metadata?: Record<string, any>;
}

export interface DataJobProgress {
    jobId: string;
    type: DataJobType;
    status: DataJobStatus;
    progress: number;
    message: string;
}
