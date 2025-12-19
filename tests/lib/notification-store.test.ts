/**
 * Unit Tests: Notification Store
 * 
 * Tests for the Zustand notification store used for tracking data ingestion
 */

import { renderHook, act } from '@testing-library/react';
import { useNotificationStore, NotificationMessages } from '@/lib/store/notification-store';

describe('Notification Store', () => {
    beforeEach(() => {
        // Reset store between tests
        const { result } = renderHook(() => useNotificationStore());
        act(() => {
            result.current.ingestionNotifications.forEach(n => {
                result.current.removeIngestionNotification(n.id);
            });
            result.current.toasts.forEach(t => {
                result.current.removeToast(t.id);
            });
        });
    });

    describe('Ingestion Notifications', () => {
        it('should add ingestion notification', () => {
            const { result } = renderHook(() => useNotificationStore());

            act(() => {
                result.current.addIngestionNotification({
                    id: 'test-1',
                    entityId: 'brand_123',
                    entityName: '40 Tons',
                    entityType: 'brand',
                    jobType: 'product_sync',
                    status: 'pending',
                    message: 'Syncing products...'
                });
            });

            expect(result.current.ingestionNotifications.length).toBe(1);
            expect(result.current.ingestionNotifications[0].entityName).toBe('40 Tons');
        });

        it('should update ingestion notification', () => {
            const { result } = renderHook(() => useNotificationStore());

            act(() => {
                result.current.addIngestionNotification({
                    id: 'test-2',
                    entityId: 'brand_456',
                    entityName: 'Test Brand',
                    entityType: 'brand',
                    jobType: 'product_sync',
                    status: 'pending',
                    message: 'Starting...'
                });
            });

            act(() => {
                result.current.updateIngestionNotification('test-2', {
                    status: 'syncing',
                    progress: 50,
                    message: 'Halfway done...'
                });
            });

            const notification = result.current.ingestionNotifications.find(n => n.id === 'test-2');
            expect(notification?.status).toBe('syncing');
            expect(notification?.progress).toBe(50);
        });

        it('should remove ingestion notification', () => {
            const { result } = renderHook(() => useNotificationStore());

            act(() => {
                result.current.addIngestionNotification({
                    id: 'test-3',
                    entityId: 'brand_789',
                    entityName: 'Remove Me',
                    entityType: 'brand',
                    jobType: 'brand_discovery',
                    status: 'complete',
                    message: 'Done!'
                });
            });

            expect(result.current.ingestionNotifications.length).toBe(1);

            act(() => {
                result.current.removeIngestionNotification('test-3');
            });

            expect(result.current.ingestionNotifications.length).toBe(0);
        });

        it('should clear completed notifications', () => {
            const { result } = renderHook(() => useNotificationStore());

            act(() => {
                result.current.addIngestionNotification({
                    id: 'pending-1',
                    entityId: 'e1',
                    entityName: 'Pending',
                    entityType: 'brand',
                    jobType: 'product_sync',
                    status: 'pending',
                    message: 'Waiting...'
                });
                result.current.addIngestionNotification({
                    id: 'complete-1',
                    entityId: 'e2',
                    entityName: 'Done',
                    entityType: 'dispensary',
                    jobType: 'product_sync',
                    status: 'complete',
                    message: 'Complete!'
                });
            });

            expect(result.current.ingestionNotifications.length).toBe(2);

            act(() => {
                result.current.clearCompletedNotifications();
            });

            expect(result.current.ingestionNotifications.length).toBe(1);
            expect(result.current.ingestionNotifications[0].status).toBe('pending');
        });
    });

    describe('Selectors', () => {
        it('should get pending notifications', () => {
            const { result } = renderHook(() => useNotificationStore());

            act(() => {
                result.current.addIngestionNotification({
                    id: 'p1',
                    entityId: 'e1',
                    entityName: 'Pending 1',
                    entityType: 'brand',
                    jobType: 'product_sync',
                    status: 'pending',
                    message: 'Pending'
                });
                result.current.addIngestionNotification({
                    id: 's1',
                    entityId: 'e2',
                    entityName: 'Syncing 1',
                    entityType: 'brand',
                    jobType: 'product_sync',
                    status: 'syncing',
                    message: 'Syncing'
                });
                result.current.addIngestionNotification({
                    id: 'c1',
                    entityId: 'e3',
                    entityName: 'Complete 1',
                    entityType: 'brand',
                    jobType: 'product_sync',
                    status: 'complete',
                    message: 'Done'
                });
            });

            const pending = result.current.getPendingNotifications();
            expect(pending.length).toBe(2); // pending + syncing
        });

        it('should check for active jobs', () => {
            const { result } = renderHook(() => useNotificationStore());

            expect(result.current.hasActiveJobs()).toBe(false);

            act(() => {
                result.current.addIngestionNotification({
                    id: 'active-1',
                    entityId: 'e1',
                    entityName: 'Active',
                    entityType: 'brand',
                    jobType: 'product_sync',
                    status: 'syncing',
                    message: 'Working...'
                });
            });

            expect(result.current.hasActiveJobs()).toBe(true);
        });
    });

    describe('Toast Notifications', () => {
        it('should add toast notification', () => {
            const { result } = renderHook(() => useNotificationStore());

            act(() => {
                result.current.addToast({
                    title: 'Success',
                    message: 'Operation completed',
                    type: 'success'
                });
            });

            expect(result.current.toasts.length).toBe(1);
            expect(result.current.toasts[0].title).toBe('Success');
        });

        it('should remove toast notification', () => {
            const { result } = renderHook(() => useNotificationStore());

            // First add a toast
            act(() => {
                result.current.addToast({
                    title: 'Test',
                    message: 'Test message',
                    type: 'info',
                    duration: -1 // Negative means never auto-remove
                });
            });

            expect(result.current.toasts.length).toBe(1);
            const toastId = result.current.toasts[0].id;

            // Then remove it
            act(() => {
                result.current.removeToast(toastId);
            });

            expect(result.current.toasts.length).toBe(0);
        });
    });

    describe('NotificationMessages', () => {
        it('should generate brand discovery pending message', () => {
            const msg = NotificationMessages.brandDiscoveryPending('Test Brand');
            expect(msg).toContain('Test Brand');
            expect(msg).toContain('Discovering');
        });

        it('should generate brand discovery complete message with count', () => {
            const msg = NotificationMessages.brandDiscoveryComplete('Test Brand', 42);
            expect(msg).toContain('Test Brand');
            expect(msg).toContain('42');
        });

        it('should generate SEO generation complete message', () => {
            const msg = NotificationMessages.seoGenerationComplete('My Dispensary', 10);
            expect(msg).toContain('My Dispensary');
            expect(msg).toContain('10');
        });
    });
});
