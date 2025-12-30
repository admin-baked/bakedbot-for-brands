import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AgentPlayground } from '@/components/landing/agent-playground';
import '@testing-library/jest-dom';

// Mock dependencies
jest.mock('@/components/chat/unified-agent-chat', () => ({
    UnifiedAgentChat: ({ locationInfo }: { locationInfo: any }) => (
        <div data-testid="unified-chat">
            Unified Chat Component
            {locationInfo && (
                <div data-testid="location-info">
                    {`Found ${locationInfo.dispensaryCount} dispensaries`}
                </div>
            )}
        </div>
    )
}));

const mockGetLandingGeoData = jest.fn();
jest.mock('@/server/actions/landing-geo', () => ({
    getLandingGeoData: (lat: number, lng: number) => mockGetLandingGeoData(lat, lng)
}));

// Mock geolocation
const mockGeolocation = {
    getCurrentPosition: jest.fn(),
    watchPosition: jest.fn()
};
(global as any).navigator.geolocation = mockGeolocation;

describe('AgentPlayground', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders unified chat component', () => {
        render(<AgentPlayground />);
        expect(screen.getByTestId('unified-chat')).toBeInTheDocument();
    });

    it('fetches geolocation and passes info to chat', async () => {
        // Setup success callback for geolocation
        mockGeolocation.getCurrentPosition.mockImplementation((success) => {
            success({
                coords: {
                    latitude: 40.7128,
                    longitude: -74.0060,
                    accuracy: 100,
                    altitude: null,
                    altitudeAccuracy: null,
                    heading: null,
                    speed: null
                },
                timestamp: Date.now()
            });
        });

        // Mock Geo Data response
        const mockGeoData = {
            location: { city: 'New York' },
            retailers: [1, 2, 3], // 3 items
            brands: [1, 2] // 2 items
        };
        mockGetLandingGeoData.mockResolvedValue(mockGeoData);

        render(<AgentPlayground />);

        // Verify geolocation was requested
        expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled();

        // Wait for data to be passed to chat
        await waitFor(() => {
            expect(mockGetLandingGeoData).toHaveBeenCalledWith(40.7128, -74.0060);
            expect(screen.getByTestId('location-info')).toHaveTextContent('Found 3 dispensaries');
        });
    });

    it('handles geolocation failure gracefully', async () => {
        // Setup error callback
        mockGeolocation.getCurrentPosition.mockImplementation((_, error) => {
            error({
                code: 1,
                message: 'User denied geolocation',
                PERMISSION_DENIED: 1,
                POSITION_UNAVAILABLE: 2,
                TIMEOUT: 3
            });
        });

        render(<AgentPlayground />);
        
        expect(screen.getByTestId('unified-chat')).toBeInTheDocument();
        // Should not have location info
        expect(screen.queryByTestId('location-info')).not.toBeInTheDocument();
    });
});
