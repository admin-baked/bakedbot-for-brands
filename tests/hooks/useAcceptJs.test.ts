
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
});
