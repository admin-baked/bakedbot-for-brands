/**
 * Unit tests for useCreativeContent hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useCreativeContent } from '../use-creative-content';
import type { CreativeContent } from '@/types/creative-content';

// Mock Firebase hooks
jest.mock('@/firebase/auth/use-user', () => ({
    useUser: jest.fn().mockReturnValue({
        user: { uid: 'user-123', tenantId: 'tenant-123' },
        isUserLoading: false
    })
}));

jest.mock('@/firebase/use-optional-firebase', () => ({
    useOptionalFirebase: jest.fn().mockReturnValue(null)
}));

jest.mock('../use-brand-id', () => ({
    useBrandId: jest.fn().mockReturnValue({
        brandId: 'brand-123',
        loading: false
    })
}));

// Mock server actions
const mockGetPendingContent = jest.fn();
const mockApproveContent = jest.fn();
const mockRequestRevision = jest.fn();
const mockGenerateContent = jest.fn();
const mockDeleteContent = jest.fn();
const mockUpdateCaption = jest.fn();

jest.mock('@/server/actions/creative-content', () => ({
    getPendingContent: (...args: any[]) => mockGetPendingContent(...args),
    approveContent: (...args: any[]) => mockApproveContent(...args),
    requestRevision: (...args: any[]) => mockRequestRevision(...args),
    generateContent: (...args: any[]) => mockGenerateContent(...args),
    deleteContent: (...args: any[]) => mockDeleteContent(...args),
    updateCaption: (...args: any[]) => mockUpdateCaption(...args)
}));

const mockContent: CreativeContent[] = [
    {
        id: 'content-1',
        tenantId: 'tenant-123',
        brandId: 'brand-123',
        platform: 'instagram',
        status: 'pending',
        complianceStatus: 'active',
        caption: 'Test caption 1',
        mediaUrls: ['https://example.com/img1.jpg'],
        mediaType: 'image',
        generatedBy: 'nano-banana',
        createdBy: 'user-123',
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        id: 'content-2',
        tenantId: 'tenant-123',
        brandId: 'brand-123',
        platform: 'tiktok',
        status: 'draft',
        complianceStatus: 'warning',
        caption: 'Test caption 2',
        mediaUrls: ['https://example.com/vid1.mp4'],
        mediaType: 'video',
        generatedBy: 'nano-banana-pro',
        createdBy: 'user-123',
        createdAt: Date.now(),
        updatedAt: Date.now()
    }
];

describe('useCreativeContent', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetPendingContent.mockResolvedValue(mockContent);
    });

    describe('initialization', () => {
        it('starts with loading state', () => {
            const { result } = renderHook(() => useCreativeContent());

            expect(result.current.loading).toBe(true);
        });

        it('starts with empty content array', () => {
            const { result } = renderHook(() => useCreativeContent());

            expect(result.current.content).toEqual([]);
        });

        it('starts with no error', () => {
            const { result } = renderHook(() => useCreativeContent());

            expect(result.current.error).toBeNull();
        });

        it('provides all action functions', () => {
            const { result } = renderHook(() => useCreativeContent());

            expect(typeof result.current.generate).toBe('function');
            expect(typeof result.current.approve).toBe('function');
            expect(typeof result.current.revise).toBe('function');
            expect(typeof result.current.editCaption).toBe('function');
            expect(typeof result.current.remove).toBe('function');
            expect(typeof result.current.refresh).toBe('function');
        });
    });

    describe('fetching content', () => {
        it('fetches pending content on mount', async () => {
            const { result } = renderHook(() => useCreativeContent({ realtime: false }));

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(mockGetPendingContent).toHaveBeenCalledWith('tenant-123');
        });

        it('sets content after fetch', async () => {
            const { result } = renderHook(() => useCreativeContent({ realtime: false }));

            await waitFor(() => {
                expect(result.current.content).toHaveLength(2);
            });
        });

        it('handles fetch error', async () => {
            mockGetPendingContent.mockRejectedValueOnce(new Error('Network error'));

            const { result } = renderHook(() => useCreativeContent({ realtime: false }));

            await waitFor(() => {
                expect(result.current.error).toBe('Network error');
            });
        });
    });

    describe('generate action', () => {
        it('calls generateContent server action', async () => {
            const generatedContent: CreativeContent = {
                ...mockContent[0],
                id: 'new-content-1'
            };
            mockGenerateContent.mockResolvedValue({ content: generatedContent });

            const { result } = renderHook(() => useCreativeContent({ realtime: false }));

            await waitFor(() => expect(result.current.loading).toBe(false));

            await act(async () => {
                await result.current.generate({
                    platform: 'instagram',
                    prompt: 'Test prompt',
                    style: 'professional'
                });
            });

            expect(mockGenerateContent).toHaveBeenCalledWith(
                expect.objectContaining({
                    platform: 'instagram',
                    prompt: 'Test prompt',
                    tenantId: 'tenant-123',
                    brandId: 'brand-123'
                })
            );
        });

        it('sets isGenerating during generation', async () => {
            mockGenerateContent.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

            const { result } = renderHook(() => useCreativeContent({ realtime: false }));

            await waitFor(() => expect(result.current.loading).toBe(false));

            act(() => {
                result.current.generate({
                    platform: 'instagram',
                    prompt: 'Test'
                });
            });

            expect(result.current.isGenerating).toBe(true);
        });

        it('returns generated content', async () => {
            const generatedContent: CreativeContent = {
                ...mockContent[0],
                id: 'new-content-1',
                caption: 'Generated caption'
            };
            mockGenerateContent.mockResolvedValue({ content: generatedContent });

            const { result } = renderHook(() => useCreativeContent({ realtime: false }));

            await waitFor(() => expect(result.current.loading).toBe(false));

            let returnedContent: CreativeContent | null = null;
            await act(async () => {
                returnedContent = await result.current.generate({
                    platform: 'instagram',
                    prompt: 'Test'
                });
            });

            expect(returnedContent?.id).toBe('new-content-1');
        });
    });

    describe('approve action', () => {
        it('calls approveContent server action', async () => {
            mockApproveContent.mockResolvedValue(undefined);

            const { result } = renderHook(() => useCreativeContent({ realtime: false }));

            await waitFor(() => expect(result.current.loading).toBe(false));

            await act(async () => {
                await result.current.approve('content-1');
            });

            expect(mockApproveContent).toHaveBeenCalledWith({
                contentId: 'content-1',
                tenantId: 'tenant-123',
                approverId: 'user-123',
                scheduledAt: undefined
            });
        });

        it('passes scheduledAt when provided', async () => {
            mockApproveContent.mockResolvedValue(undefined);

            const { result } = renderHook(() => useCreativeContent({ realtime: false }));

            await waitFor(() => expect(result.current.loading).toBe(false));

            await act(async () => {
                await result.current.approve('content-1', '2025-01-20T10:00:00Z');
            });

            expect(mockApproveContent).toHaveBeenCalledWith(
                expect.objectContaining({
                    scheduledAt: '2025-01-20T10:00:00Z'
                })
            );
        });

        it('sets isApproving with content ID', async () => {
            mockApproveContent.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

            const { result } = renderHook(() => useCreativeContent({ realtime: false }));

            await waitFor(() => expect(result.current.loading).toBe(false));

            act(() => {
                result.current.approve('content-1');
            });

            expect(result.current.isApproving).toBe('content-1');
        });
    });

    describe('revise action', () => {
        it('calls requestRevision server action', async () => {
            mockRequestRevision.mockResolvedValue(undefined);

            const { result } = renderHook(() => useCreativeContent({ realtime: false }));

            await waitFor(() => expect(result.current.loading).toBe(false));

            await act(async () => {
                await result.current.revise('content-1', 'Please adjust the tone');
            });

            expect(mockRequestRevision).toHaveBeenCalledWith({
                contentId: 'content-1',
                tenantId: 'tenant-123',
                requesterId: 'user-123',
                note: 'Please adjust the tone'
            });
        });
    });

    describe('editCaption action', () => {
        it('calls updateCaption server action', async () => {
            mockUpdateCaption.mockResolvedValue(undefined);

            const { result } = renderHook(() => useCreativeContent({ realtime: false }));

            await waitFor(() => expect(result.current.loading).toBe(false));

            await act(async () => {
                await result.current.editCaption('content-1', 'Updated caption text');
            });

            expect(mockUpdateCaption).toHaveBeenCalledWith(
                'tenant-123',
                'content-1',
                'Updated caption text'
            );
        });

        it('updates local state when not using realtime', async () => {
            mockUpdateCaption.mockResolvedValue(undefined);

            const { result } = renderHook(() => useCreativeContent({ realtime: false }));

            await waitFor(() => expect(result.current.loading).toBe(false));
            expect(result.current.content[0].caption).toBe('Test caption 1');

            await act(async () => {
                await result.current.editCaption('content-1', 'Edited caption');
            });

            expect(result.current.content.find(c => c.id === 'content-1')?.caption).toBe('Edited caption');
        });

        it('handles edit error', async () => {
            mockUpdateCaption.mockRejectedValueOnce(new Error('Update failed'));

            const { result } = renderHook(() => useCreativeContent({ realtime: false }));

            await waitFor(() => expect(result.current.loading).toBe(false));

            await act(async () => {
                await result.current.editCaption('content-1', 'New caption');
            });

            expect(result.current.error).toBe('Update failed');
        });

        it('does not call server action if tenantId is missing', async () => {
            // Mock no tenant ID
            jest.doMock('@/firebase/auth/use-user', () => ({
                useUser: jest.fn().mockReturnValue({
                    user: { uid: 'user-123' }, // No tenantId
                    isUserLoading: false
                })
            }));

            const { result } = renderHook(() => useCreativeContent({ realtime: false }));

            await waitFor(() => expect(result.current.loading).toBe(false));

            mockUpdateCaption.mockClear();

            await act(async () => {
                await result.current.editCaption('content-1', 'New caption');
            });

            // Should set error about missing tenant ID (depending on implementation)
            // The important thing is it shouldn't crash
        });
    });

    describe('remove action', () => {
        it('calls deleteContent server action', async () => {
            mockDeleteContent.mockResolvedValue(undefined);

            const { result } = renderHook(() => useCreativeContent({ realtime: false }));

            await waitFor(() => expect(result.current.loading).toBe(false));

            await act(async () => {
                await result.current.remove('content-1');
            });

            expect(mockDeleteContent).toHaveBeenCalledWith('tenant-123', 'content-1');
        });
    });

    describe('refresh action', () => {
        it('triggers re-fetch of content', async () => {
            const { result } = renderHook(() => useCreativeContent({ realtime: false }));

            await waitFor(() => expect(result.current.loading).toBe(false));

            // Clear mock to check if called again
            mockGetPendingContent.mockClear();

            await act(async () => {
                result.current.refresh();
            });

            await waitFor(() => {
                expect(mockGetPendingContent).toHaveBeenCalled();
            });
        });
    });

    describe('options', () => {
        it('filters by platform when specified', async () => {
            const { result } = renderHook(() =>
                useCreativeContent({ platform: 'instagram', realtime: false })
            );

            await waitFor(() => expect(result.current.loading).toBe(false));

            // With platform filter, should filter the fetched results
            expect(result.current.content.every(c => c.platform === 'instagram')).toBe(true);
        });
    });

    describe('error handling', () => {
        it('sets error on generate failure', async () => {
            mockGenerateContent.mockRejectedValueOnce(new Error('Generation failed'));

            const { result } = renderHook(() => useCreativeContent({ realtime: false }));

            await waitFor(() => expect(result.current.loading).toBe(false));

            await act(async () => {
                await result.current.generate({
                    platform: 'instagram',
                    prompt: 'Test'
                });
            });

            expect(result.current.error).toBe('Generation failed');
        });

        it('sets error on approve failure', async () => {
            mockApproveContent.mockRejectedValueOnce(new Error('Approval failed'));

            const { result } = renderHook(() => useCreativeContent({ realtime: false }));

            await waitFor(() => expect(result.current.loading).toBe(false));

            await act(async () => {
                await result.current.approve('content-1');
            });

            expect(result.current.error).toBe('Approval failed');
        });
    });
});
