
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the PuffChat component
jest.mock('@/app/dashboard/ceo/components/puff-chat', () => ({
    PuffChat: ({ persona }: any) => <div data-testid="agent-chat">{persona}</div>
}));

// Mock lucide-react
jest.mock('lucide-react', () => {
    const mockIcon = (name: string) => (props: any) => <svg data-testid={`icon-${name}`} {...props} />;
    return {
        Users: mockIcon('Users'),
        Rocket: mockIcon('Rocket'),
        Briefcase: mockIcon('Briefcase'),
        Wrench: mockIcon('Wrench'),
        Sparkles: mockIcon('Sparkles'),
        DollarSign: mockIcon('DollarSign'),
        BarChart3: mockIcon('BarChart3'),
        ShieldAlert: mockIcon('ShieldAlert'),
        Zap: mockIcon('Zap'),
        TrendingUp: mockIcon('TrendingUp'),
        CheckCircle2: mockIcon('CheckCircle2'),
        MessageSquare: mockIcon('MessageSquare'),
        Send: mockIcon('Send'),
        TrendingDown: mockIcon('TrendingDown'),
    };
});

// Mock firebase auth
jest.mock('@/firebase/auth/use-user', () => ({
    useUser: () => ({ user: { uid: 'user-123' } })
}));

// Mock utils
jest.mock('@/lib/utils', () => ({
    cn: (...args: any[]) => args.filter(Boolean).join(' ')
}));

describe('BoardroomTab', () => {
    let BoardroomTab: any;

    beforeAll(async () => {
        const module = await import('../components/boardroom-tab');
        BoardroomTab = module.default;
    });

    it('should render the boardroom header and executive team', () => {
        render(<BoardroomTab />);
        
        expect(screen.getByText('Executive Boardroom')).toBeInTheDocument();
        expect(screen.getByText('Leo')).toBeInTheDocument();
        expect(screen.getByText('Jack')).toBeInTheDocument();
    });

    it('should render KPI widgets', () => {
        render(<BoardroomTab />);
        
        expect(screen.getByText('Revenue Growth (MRR)')).toBeInTheDocument();
        expect(screen.getByText('$34,250')).toBeInTheDocument();
    });

    it('should switch agents when clicking on their cards', () => {
        render(<BoardroomTab />);
        
        const jackCard = screen.getByText('Jack').closest('.transition-all');
        if (jackCard) fireEvent.click(jackCard);
        
        expect(screen.getByText(/Current Speaker: Jack/)).toBeInTheDocument();
        expect(screen.getByTestId('agent-chat').textContent).toBe('jack');
    });

    it('should default to Leo as the current speaker', () => {
        render(<BoardroomTab />);
        
        expect(screen.getByText(/Current Speaker: Leo/)).toBeInTheDocument();
        expect(screen.getByTestId('agent-chat').textContent).toBe('leo');
    });
});
