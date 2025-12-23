import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuickStartCards } from '@/components/dashboard/quick-start-cards';
import { useUserRole } from '@/hooks/use-user-role';
import '@testing-library/jest-dom';

// Mock useUserRole
jest.mock('@/hooks/use-user-role', () => ({
    useUserRole: jest.fn(),
}));

// Mock QUICK_START_CARDS
jest.mock('@/lib/config/quick-start-cards', () => ({
    QUICK_START_CARDS: [
        {
            id: 'disp_1',
            title: 'Dispensary Card',
            description: 'Disp Desc',
            icon: 'menu',
            estimatedTime: '10 min',
            prompt: 'Disp Prompt',
            roles: ['dispensary']
        },
        {
            id: 'brand_1',
            title: 'Brand Card',
            description: 'Brand Desc',
            icon: 'globe',
            estimatedTime: '15 min',
            prompt: 'Brand Prompt',
            playbookId: 'pb_brand_1',
            roles: ['brand']
        }
    ]
}));

describe('QuickStartCards', () => {
    it('returns null for owner role', () => {
        (useUserRole as jest.Mock).mockReturnValue({ role: 'owner' });
        const { container } = render(<QuickStartCards />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders dispensary cards for dispensary role', () => {
        (useUserRole as jest.Mock).mockReturnValue({ role: 'dispensary' });
        render(<QuickStartCards />);
        
        expect(screen.getByText('Dispensary Card')).toBeInTheDocument();
        expect(screen.queryByText('Brand Card')).not.toBeInTheDocument();
    });

    it('renders brand cards for brand role', () => {
        (useUserRole as jest.Mock).mockReturnValue({ role: 'brand' });
        render(<QuickStartCards />);
        
        expect(screen.getByText('Brand Card')).toBeInTheDocument();
        expect(screen.queryByText('Dispensary Card')).not.toBeInTheDocument();
    });

    it('triggers onCardClick with correct arguments when a card is clicked', () => {
        (useUserRole as jest.Mock).mockReturnValue({ role: 'brand' });
        const onCardClick = jest.fn();
        render(<QuickStartCards onCardClick={onCardClick} />);
        
        // Clicking the title should bubble up to the Card's onClick
        fireEvent.click(screen.getByText('Brand Card'));
        
        expect(onCardClick).toHaveBeenCalledWith('Brand Prompt', 'pb_brand_1');
    });

    it('renders estimated time for cards', () => {
        (useUserRole as jest.Mock).mockReturnValue({ role: 'dispensary' });
        render(<QuickStartCards />);
        
        expect(screen.getByText('10 min')).toBeInTheDocument();
    });
});
