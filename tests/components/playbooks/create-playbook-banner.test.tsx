import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CreatePlaybookBanner } from '@/app/dashboard/playbooks/components/create-playbook-banner';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
    Plus: () => <div data-testid="icon-plus" />,
}));

describe('CreatePlaybookBanner', () => {
    it('renders the banner title', () => {
        render(<CreatePlaybookBanner onClick={jest.fn()} />);
        expect(screen.getByText('Create a New Playbook')).toBeInTheDocument();
    });

    it('renders the banner description', () => {
        render(<CreatePlaybookBanner onClick={jest.fn()} />);
        expect(screen.getByText('Build a new Playbook to automate via chat.')).toBeInTheDocument();
    });

    it('renders the plus icon', () => {
        render(<CreatePlaybookBanner onClick={jest.fn()} />);
        expect(screen.getByTestId('icon-plus')).toBeInTheDocument();
    });

    it('calls onClick when banner is clicked', () => {
        const onClick = jest.fn();
        render(<CreatePlaybookBanner onClick={onClick} />);

        const banner = screen.getByText('Create a New Playbook').closest('div[class*="cursor-pointer"]');
        if (banner) {
            fireEvent.click(banner);
        }
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('has glass-card styling classes', () => {
        const { container } = render(<CreatePlaybookBanner onClick={jest.fn()} />);
        const banner = container.querySelector('[class*="glass-card"]');
        expect(banner).toBeInTheDocument();
    });

    it('has dashed border styling', () => {
        const { container } = render(<CreatePlaybookBanner onClick={jest.fn()} />);
        const banner = container.querySelector('[class*="border-dashed"]');
        expect(banner).toBeInTheDocument();
    });
});
