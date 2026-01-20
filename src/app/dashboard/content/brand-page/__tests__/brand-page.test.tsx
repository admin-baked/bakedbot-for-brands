import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import BrandPageManager from '../page';
import { useUser } from '@/firebase/auth/use-user';
import { useToast } from '@/hooks/use-toast';

// Mock lucide-react icons with a Proxy to handle any icon dynamically
jest.mock('lucide-react', () => {
    const createMockIcon = (name: string) => {
        return ({ className }: { className?: string }) => <span className={className} data-testid={`icon-${name.toLowerCase()}`} />;
    };

    // Return a Proxy that creates mock icons for any accessed property
    return new Proxy({}, {
        get: (target, prop) => {
            if (typeof prop === 'string') {
                return createMockIcon(prop);
            }
            return undefined;
        }
    });
});

// Mock helpers
const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
    useToast: () => ({ toast: mockToast })
}));

jest.mock('@/firebase/auth/use-user', () => ({
    useUser: jest.fn()
}));

jest.mock('@/server/actions/brand-profile', () => ({
    updateBrandProfile: jest.fn()
}));

// Mock dynamic imports for Firestore
jest.mock('@/firebase/client', () => ({
    db: {}
}), { virtual: true });

// We need to support the dynamic import('firebase/firestore') usage in the component
// Since jest runs in node, we can simulate this by mocking the module itself, 
// assuming the component uses `await import(...)`.
// However, `jest.mock` hoists, so we can standard mock 'firebase/firestore' 
// and the dynamic import will likely resolve to it in a Jest environment (depending on config).
// If `import()` fails in Jest, we might need a spy.
// Let's try standard mocking first. If the component uses `await import('firebase/firestore')`, 
// Jest often resolves it to the mocked module.

const mockGetDoc = jest.fn();
const mockDoc = jest.fn();

jest.mock('firebase/firestore', () => ({
    getDoc: (...args: any[]) => mockGetDoc(...args),
    doc: (...args: any[]) => mockDoc(...args),
}));

describe('BrandPageManager', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('shows loading state initially', async () => {
        (useUser as jest.Mock).mockReturnValue({ user: { uid: '123' }, isUserLoading: true });
        render(<BrandPageManager />);
        // Should show loader
        expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('uses user.uid as brandId fallback for brand users without explicit brandId', async () => {
        (useUser as jest.Mock).mockReturnValue({ user: { uid: '123' }, isUserLoading: false });

        // Mock Firestore user doc with role='brand' but no brandId
        // The fix should use uid as fallback brandId
        let callCount = 0;
        mockGetDoc.mockImplementation((ref) => {
            callCount++;
            if (callCount === 1) {
                // User doc - has role='brand' but no brandId
                return Promise.resolve({
                    exists: () => true,
                    data: () => ({ name: 'Test User', role: 'brand' })
                });
            } else {
                // Brand doc lookup using uid ('123') as fallback
                return Promise.resolve({
                    exists: () => true,
                    data: () => ({
                        name: 'Fallback Brand',
                        description: 'Brand using uid as id'
                    })
                });
            }
        });

        render(<BrandPageManager />);

        await waitFor(() => {
            // Should find brand using uid fallback
            expect(screen.getByDisplayValue('Fallback Brand')).toBeInTheDocument();
        });
    });

    it('shows no brand associated state if user has neither brandId nor brand role', async () => {
        (useUser as jest.Mock).mockReturnValue({ user: { uid: '123' }, isUserLoading: false });

        // Mock Firestore user doc response - no brandId and no brand role
        mockGetDoc.mockImplementation((ref) => {
            return Promise.resolve({
                exists: () => true,
                data: () => ({ name: 'Test User' }) // No brandId, no role
            });
        });

        render(<BrandPageManager />);

        await waitFor(() => {
            expect(screen.getByText('No Brand Associated')).toBeInTheDocument();
        });
        expect(screen.getByText('Link Brand')).toBeInTheDocument();
    });

    it('loads brand data successfully', async () => {
        (useUser as jest.Mock).mockReturnValue({ user: { uid: '123' }, isUserLoading: false });

        mockGetDoc.mockImplementation((ref) => {
            // We can distinguish calls by ref, but for simple mock:
            // First call is user doc, second is brand doc (if user has brandId).
            // Let's use simple logic: if we returned brandId, next call expects it.
            return Promise.resolve({
                exists: () => true,
                data: () => ({
                    brandId: 'brand-123',
                    name: 'My Cool Brand',
                    description: 'Best brand',
                    logoUrl: 'logo.png'
                })
            });
        });

        render(<BrandPageManager />);

        await waitFor(() => {
            expect(screen.getByDisplayValue('My Cool Brand')).toBeInTheDocument();
        });
        expect(screen.getByDisplayValue('Best brand')).toBeInTheDocument();
    });

    it('handles permission denied error gracefully', async () => {
        (useUser as jest.Mock).mockReturnValue({ user: { uid: '123' }, isUserLoading: false });

        const permError = new Error('Missing or Insufficient permissions');
        (permError as any).code = 'permission-denied';

        mockGetDoc.mockRejectedValueOnce(permError);

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

        render(<BrandPageManager />);

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
                variant: 'destructive',
                title: 'Error Loading Brand'
            }));
        });

        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('PERMISSION DENIED DEBUG'), expect.any(Object));

        consoleSpy.mockRestore();
    });
});
