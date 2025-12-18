
import { apiCall } from '../../dev/scan_leafly_complete';
import https from 'https';
import { EventEmitter } from 'events';

// Mock https
jest.mock('https');

describe('Leafly Scan Logic', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('apiCall should make HTTPS request and return parsed JSON', async () => {
        const mockResponse = new EventEmitter() as any;
        mockResponse.statusCode = 200;

        // Mock request flow
        const mockRequest = new EventEmitter();
        (mockRequest as any).end = jest.fn();
        (mockRequest as any).write = jest.fn();

        (https.request as jest.Mock).mockImplementation((url, options, callback) => {
            callback(mockResponse);
            // Simulate data
            mockResponse.emit('data', JSON.stringify({ success: true, data: [] }));
            mockResponse.emit('end');
            return mockRequest;
        });

        const result = await apiCall('/test-endpoint', 'GET');
        expect(result).toEqual({ success: true, data: [] });
        expect(https.request).toHaveBeenCalled();
    });

    it('apiCall should handle API errors (400+)', async () => {
        const mockResponse = new EventEmitter() as any;
        mockResponse.statusCode = 404;

        const mockRequest = new EventEmitter();
        (mockRequest as any).end = jest.fn();

        (https.request as jest.Mock).mockImplementation((url, options, callback) => {
            callback(mockResponse);
            mockResponse.emit('data', 'Not Found');
            mockResponse.emit('end');
            return mockRequest;
        });

        await expect(apiCall('/bad-endpoint', 'GET'))
            .rejects.toMatch(/API Error 404/);
    });
});
