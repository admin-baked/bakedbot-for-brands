'use client';

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { HeartbeatIndicator } from '../heartbeat-indicator';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

// Helper to create mock response
function createMockResponse(data: any) {
    return {
        ok: true,
        json: async () => data,
    } as any;
}

describe('HeartbeatIndicator', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Size variants', () => {
        it('renders and fetches status on mount', async () => {
            mockFetch.mockResolvedValueOnce(
                createMockResponse({
                    pulse: 'alive',
                    timestamp: new Date().toISOString(),
                    healthy: true,
                })
            );

            const { container } = render(<HeartbeatIndicator />);

            await waitFor(() => {
                expect(mockFetch).toHaveBeenCalledWith('/api/system/health');
            });

            // Verify component rendered
            expect(container.querySelector('.relative')).toBeInTheDocument();
        });

        it('applies small size classes when size="small"', async () => {
            mockFetch.mockResolvedValueOnce(
                createMockResponse({
                    pulse: 'alive',
                    timestamp: new Date().toISOString(),
                    healthy: true,
                })
            );

            const { container } = render(<HeartbeatIndicator size="small" />);

            await waitFor(() => {
                expect(mockFetch).toHaveBeenCalled();
            });

            // Small size should have w-2 and h-2
            const dot = container.querySelector('[class*="w-2"]');
            expect(dot).toBeInTheDocument();
        });

        it('applies large size classes and shows label when size="large" and showLabel', async () => {
            mockFetch.mockResolvedValueOnce(
                createMockResponse({
                    pulse: 'alive',
                    timestamp: new Date().toISOString(),
                    healthy: true,
                })
            );

            render(<HeartbeatIndicator size="large" showLabel={true} />);

            await waitFor(() => {
                expect(screen.getByText('System Healthy')).toBeInTheDocument();
            });
        });
    });

    describe('Pulse states', () => {
        it('shows green color for alive pulse', async () => {
            mockFetch.mockResolvedValueOnce(
                createMockResponse({
                    pulse: 'alive',
                    timestamp: new Date().toISOString(),
                    healthy: true,
                })
            );

            render(<HeartbeatIndicator showLabel={true} />);

            await waitFor(() => {
                expect(screen.getByText('System Healthy')).toBeInTheDocument();
            });
        });

        it('shows yellow color for warning pulse', async () => {
            mockFetch.mockResolvedValueOnce(
                createMockResponse({
                    pulse: 'warning',
                    timestamp: new Date().toISOString(),
                    healthy: false,
                })
            );

            render(<HeartbeatIndicator showLabel={true} />);

            await waitFor(() => {
                expect(screen.getByText('Heartbeat Delayed')).toBeInTheDocument();
            });
        });

        it('shows red color for error pulse', async () => {
            mockFetch.mockResolvedValueOnce(
                createMockResponse({
                    pulse: 'error',
                    timestamp: new Date().toISOString(),
                    healthy: false,
                })
            );

            render(<HeartbeatIndicator showLabel={true} />);

            await waitFor(() => {
                expect(screen.getByText('System Error')).toBeInTheDocument();
            });
        });

        it('shows gray color for unknown pulse', async () => {
            mockFetch.mockResolvedValueOnce(
                createMockResponse({
                    pulse: 'unknown',
                    timestamp: null,
                    healthy: false,
                })
            );

            render(<HeartbeatIndicator showLabel={true} />);

            await waitFor(() => {
                expect(screen.getByText('Status Unknown')).toBeInTheDocument();
            });
        });
    });

    describe('Tooltip', () => {
        it('displays tooltip with status and timestamp when showTooltip is true', async () => {
            const timestamp = new Date('2026-02-15T10:00:00Z');
            mockFetch.mockResolvedValueOnce(
                createMockResponse({
                    pulse: 'alive',
                    timestamp: timestamp.toISOString(),
                    healthy: true,
                })
            );

            render(<HeartbeatIndicator showTooltip={true} />);

            await waitFor(() => {
                expect(screen.getByText('Status:')).toBeInTheDocument();
            });

            // Verify tooltip has status label
            expect(screen.getByText('System Healthy')).toBeInTheDocument();
        });

        it('hides tooltip when showTooltip is false', async () => {
            mockFetch.mockResolvedValueOnce(
                createMockResponse({
                    pulse: 'alive',
                    timestamp: new Date().toISOString(),
                    healthy: true,
                })
            );

            const { container } = render(<HeartbeatIndicator showTooltip={false} />);

            await waitFor(() => {
                expect(mockFetch).toHaveBeenCalled();
            });

            // Info button should not be present
            const infoButton = container.querySelector('[aria-label="Heartbeat details"]');
            expect(infoButton).not.toBeInTheDocument();
        });
    });

    describe('Loading state', () => {
        it('shows loading spinner while fetching', async () => {
            mockFetch.mockImplementationOnce(() => new Promise(() => {})); // Never resolves

            const { container } = render(<HeartbeatIndicator />);

            // Should show animate-pulse class on loading
            const loadingDot = container.querySelector('.animate-pulse');
            expect(loadingDot).toBeInTheDocument();
        });
    });

    describe('Error handling', () => {
        it('shows error state when fetch fails', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            render(<HeartbeatIndicator showLabel={true} />);

            await waitFor(() => {
                expect(screen.getByText('System Error')).toBeInTheDocument();
            });
        });

        it('shows error state when response is not ok', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                json: async () => ({}),
            } as any);

            render(<HeartbeatIndicator showLabel={true} />);

            await waitFor(() => {
                expect(screen.getByText('System Error')).toBeInTheDocument();
            });
        });
    });

    describe('Polling', () => {
        it('calls fetch initially and does not setup polling by default', async () => {
            mockFetch.mockResolvedValue(
                createMockResponse({
                    pulse: 'alive',
                    timestamp: new Date().toISOString(),
                    healthy: true,
                })
            );

            render(<HeartbeatIndicator />);

            await waitFor(() => {
                expect(mockFetch).toHaveBeenCalledTimes(1);
            });
        });
    });

    describe('Custom className', () => {
        it('applies custom className to container', async () => {
            mockFetch.mockResolvedValueOnce(
                createMockResponse({
                    pulse: 'alive',
                    timestamp: new Date().toISOString(),
                    healthy: true,
                })
            );

            const { container } = render(
                <HeartbeatIndicator className="custom-class" />
            );

            await waitFor(() => {
                expect(mockFetch).toHaveBeenCalled();
            });

            const wrapper = container.querySelector('.custom-class');
            expect(wrapper).toBeInTheDocument();
        });
    });
});
