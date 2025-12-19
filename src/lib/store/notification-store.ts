/**
 * Notification Store
 * 
 * Zustand store for managing onboarding and data ingestion notifications.
 * Provides real-time status updates for entity sync operations.
 */

import { create } from 'zustand';

export type IngestionStatus = 'pending' | 'syncing' | 'complete' | 'error';
export type JobType = 'brand_discovery' | 'product_sync' | 'seo_generation' | 'dispensary_setup';

export interface IngestionNotification {
    id: string;
    entityId: string;
    entityName: string;
    entityType: 'brand' | 'dispensary';
    jobType: JobType;
    status: IngestionStatus;
    message: string;
    progress?: number;
    error?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface NotificationToast {
    id: string;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    duration?: number;
    createdAt: Date;
}

interface NotificationState {
    // Ingestion notifications (persistent until dismissed)
    ingestionNotifications: IngestionNotification[];

    // Toast notifications (auto-dismiss)
    toasts: NotificationToast[];

    // Actions
    addIngestionNotification: (notification: Omit<IngestionNotification, 'createdAt' | 'updatedAt'>) => void;
    updateIngestionNotification: (id: string, updates: Partial<IngestionNotification>) => void;
    removeIngestionNotification: (id: string) => void;
    clearCompletedNotifications: () => void;

    addToast: (toast: Omit<NotificationToast, 'id' | 'createdAt'>) => void;
    removeToast: (id: string) => void;

    // Selectors
    getPendingNotifications: () => IngestionNotification[];
    hasActiveJobs: () => boolean;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
    ingestionNotifications: [],
    toasts: [],

    addIngestionNotification: (notification) => set((state) => ({
        ingestionNotifications: [
            ...state.ingestionNotifications,
            {
                ...notification,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ]
    })),

    updateIngestionNotification: (id, updates) => set((state) => ({
        ingestionNotifications: state.ingestionNotifications.map(n =>
            n.id === id
                ? { ...n, ...updates, updatedAt: new Date() }
                : n
        )
    })),

    removeIngestionNotification: (id) => set((state) => ({
        ingestionNotifications: state.ingestionNotifications.filter(n => n.id !== id)
    })),

    clearCompletedNotifications: () => set((state) => ({
        ingestionNotifications: state.ingestionNotifications.filter(
            n => n.status !== 'complete'
        )
    })),

    addToast: (toast) => {
        const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newToast: NotificationToast = {
            ...toast,
            id,
            createdAt: new Date()
        };

        set((state) => ({
            toasts: [...state.toasts, newToast]
        }));

        // Auto-remove after duration (default 5s)
        const duration = toast.duration ?? 5000;
        if (duration > 0) {
            setTimeout(() => {
                get().removeToast(id);
            }, duration);
        }
    },

    removeToast: (id) => set((state) => ({
        toasts: state.toasts.filter(t => t.id !== id)
    })),

    getPendingNotifications: () => {
        return get().ingestionNotifications.filter(
            n => n.status === 'pending' || n.status === 'syncing'
        );
    },

    hasActiveJobs: () => {
        return get().ingestionNotifications.some(
            n => n.status === 'pending' || n.status === 'syncing'
        );
    }
}));

// Helper to create standard notification messages
export const NotificationMessages = {
    brandDiscoveryPending: (name: string) => `Discovering data for ${name}...`,
    brandDiscoverySyncing: (name: string) => `Syncing products for ${name}...`,
    brandDiscoveryComplete: (name: string, count: number) =>
        `${name}: ${count} products synced successfully`,
    brandDiscoveryError: (name: string) => `Failed to sync data for ${name}`,

    seoGenerationPending: (name: string) => `Generating SEO pages for ${name}...`,
    seoGenerationComplete: (name: string, count: number) =>
        `${name}: ${count} local pages generated`,

    dispensarySetupPending: (name: string) => `Setting up ${name}...`,
    dispensarySetupComplete: (name: string) => `${name} is ready!`
};
