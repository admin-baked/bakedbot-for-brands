
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAcceptJs } from '@/hooks/useAcceptJs';

describe('useAcceptJs', () => {
    const mockDispatchData = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        // Clear window.Accept
        delete (window as any).Accept;
        // Clear script tags
        document.head.innerHTML = '';
    });

    it('sets isLoaded to true immediately if window.Accept exists', () => {
        (window as any).Accept = { dispatchData: mockDispatchData };

        const { result } = renderHook(() => useAcceptJs({ clientKey: 'key', apiLoginId: 'login' }));

        expect(result.current.isLoaded).toBe(true);
    });

    it('injects script if window.Accept missing', () => {
        renderHook(() => useAcceptJs({ clientKey: 'key', apiLoginId: 'login' }));

        const script = document.querySelector('script[src*="Accept.js"]');
        expect(script).toBeInTheDocument();
    });

    it('handles tokenization success', async () => {
        (window as any).Accept = {
            dispatchData: (data: any, cb: any) => {
                cb({
                    messages: { resultCode: 'Ok' },
                    opaqueData: { dataDescriptor: 'desc', dataValue: 'val' }
                });
            }
        };

        const { result } = renderHook(() => useAcceptJs({ clientKey: 'key', apiLoginId: 'login' }));

        await waitFor(() => expect(result.current.isLoaded).toBe(true));

        let token;
        await act(async () => {
            token = await result.current.tokenizeCard({
                cardNumber: '1234',
                expirationMonth: '12',
                expirationYear: '25',
                cvv: '123'
            });
        });

        expect(token).toEqual({ dataDescriptor: 'desc', dataValue: 'val' });
    });

    it('handles tokenization error', async () => {
        (window as any).Accept = {
            dispatchData: (data: any, cb: any) => {
                cb({
                    messages: {
                        resultCode: 'Error',
                        message: [{ text: 'Invalid Card' }]
                    }
                });
            }
        };

        const { result } = renderHook(() => useAcceptJs({ clientKey: 'key', apiLoginId: 'login' }));

        await waitFor(() => expect(result.current.isLoaded).toBe(true));

        await act(async () => {
            try {
                await result.current.tokenizeCard({
                    cardNumber: '1234',
                    expirationMonth: '12',
                    expirationYear: '25',
                    cvv: '123'
                });
            } catch (e) {
                // Expected
            }
        });

        expect(result.current.error).toBe('Invalid Card');
    });

    it('provides retryLoad function to re-attempt script loading', async () => {
        const { result } = renderHook(() => useAcceptJs({ clientKey: 'key', apiLoginId: 'login' }));

        // Initially not loaded
        expect(result.current.isLoaded).toBe(false);

        // Simulate Accept being available after retry
        (window as any).Accept = { dispatchData: mockDispatchData };

        await act(async () => {
            result.current.retryLoad();
        });

        // After retry with Accept available, should become loaded
        await waitFor(() => expect(result.current.isLoaded).toBe(true));
    });

    it('clears error when retryLoad is called', async () => {
        // Pre-set Accept so hook loads immediately
        (window as any).Accept = {
            dispatchData: (data: any, cb: any) => {
                cb({
                    messages: {
                        resultCode: 'Error',
                        message: [{ text: 'Test Error' }]
                    }
                });
            }
        };

        const { result } = renderHook(() => useAcceptJs({ clientKey: 'key', apiLoginId: 'login' }));

        await waitFor(() => expect(result.current.isLoaded).toBe(true));

        // Trigger an error
        await act(async () => {
            try {
                await result.current.tokenizeCard({
                    cardNumber: '1234',
                    expirationMonth: '12',
                    expirationYear: '25',
                    cvv: '123'
                });
            } catch (e) {
                // Expected
            }
        });

        expect(result.current.error).toBe('Test Error');

        // Now fix Accept for successful tokenization
        (window as any).Accept = {
            dispatchData: (data: any, cb: any) => {
                cb({
                    messages: { resultCode: 'Ok' },
                    opaqueData: { dataDescriptor: 'desc', dataValue: 'val' }
                });
            }
        };

        // retryLoad clears the error state
        await act(async () => {
            result.current.retryLoad();
        });

        // Error should be cleared after retry
        await waitFor(() => expect(result.current.error).toBe(null));
    });
});
