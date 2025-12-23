import { render, screen } from '@testing-library/react';
import KnowledgeBasePage from '@/app/dashboard/knowledge-base/page';

// Mocks
jest.mock('@/hooks/use-user-role', () => ({
    useUserRole: jest.fn()
}));

jest.mock('@/firebase/auth/use-user', () => ({
    useUser: jest.fn()
}));

// Mock child components to avoid testing their internals here
jest.mock('@/app/dashboard/playbooks/components/brand-knowledge-base', () => ({
    BrandKnowledgeBase: () => <div data-testid="brand-kb">Brand KB Component</div>
}));

jest.mock('@/components/dashboard/dispensary-knowledge-base', () => ({
    DispensaryKnowledgeBase: () => <div data-testid="dispensary-kb">Dispensary KB Component</div>
}));

import { useUserRole } from '@/hooks/use-user-role';
import { useUser } from '@/firebase/auth/use-user';

describe('KnowledgeBasePage', () => {
    
    it('shows loading spinner when data is loading', () => {
        (useUserRole as jest.Mock).mockReturnValue({ role: null, isLoading: true });
        (useUser as jest.Mock).mockReturnValue({ user: null, isUserLoading: false });

        render(<KnowledgeBasePage />);
        // Spinner usually has role="status" or just check for a class, here checking for generic loading presence logic implicitly 
        // effectively checking if main content is NOT there is simpler if we don't have explicit spinner testid
        const heading = screen.queryByText('Knowledge Base');
        expect(heading).not.toBeInTheDocument();
    });

    it('renders BrandKnowledgeBase for brand user', () => {
        (useUserRole as jest.Mock).mockReturnValue({ role: 'brand', isLoading: false });
        (useUser as jest.Mock).mockReturnValue({ 
            user: { uid: 'brand-123' }, 
            isUserLoading: false 
        });

        render(<KnowledgeBasePage />);
        
        expect(screen.getByTestId('brand-kb')).toBeInTheDocument();
        expect(screen.queryByTestId('dispensary-kb')).not.toBeInTheDocument();
    });

    it('renders DispensaryKnowledgeBase for dispensary user', () => {
        (useUserRole as jest.Mock).mockReturnValue({ role: 'dispensary', isLoading: false });
        (useUser as jest.Mock).mockReturnValue({ 
            user: { uid: 'dispensary-123' }, 
            isUserLoading: false 
        });

        render(<KnowledgeBasePage />);
        
        expect(screen.getByTestId('dispensary-kb')).toBeInTheDocument();
        expect(screen.queryByTestId('brand-kb')).not.toBeInTheDocument();
    });

    it('shows access denied message for other roles', () => {
        (useUserRole as jest.Mock).mockReturnValue({ role: 'customer', isLoading: false });
        (useUser as jest.Mock).mockReturnValue({ 
            user: { uid: 'cust-123' }, 
            isUserLoading: false 
        });

        render(<KnowledgeBasePage />);
        
        expect(screen.getByText(/not available for your current role/i)).toBeInTheDocument();
        expect(screen.queryByTestId('brand-kb')).not.toBeInTheDocument();
        expect(screen.queryByTestId('dispensary-kb')).not.toBeInTheDocument();
    });
});
