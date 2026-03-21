import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SmokeyRecommendsSection } from '../smokey-recommends';

// Mock dependencies
jest.mock('lucide-react', () => ({
    Settings2: () => <div data-testid="icon-settings" />,
    Zap: () => <div data-testid="icon-zap" />,
    AlertTriangle: () => <div data-testid="icon-alert" />,
    Star: () => <div data-testid="icon-star" />,
    TrendingUp: () => <div data-testid="icon-trending" />,
    Package: () => <div data-testid="icon-package" />,
    Users: () => <div data-testid="icon-users" />,
    Store: () => <div data-testid="icon-store" />,
    BarChart3: () => <div data-testid="icon-bar" />,
    Search: () => <div data-testid="icon-search" />,
    ShoppingBag: () => <div data-testid="icon-bag" />,
    Sparkles: () => <div data-testid="icon-sparkles" />,
}));

jest.mock('../playbook-setup-wizard', () => ({
    PlaybookSetupWizard: ({ onComplete, onCancel }: any) => (
        <div data-testid="wizard">
            <button data-testid="wizard-complete" onClick={() => onComplete({})}>Complete</button>
            <button data-testid="wizard-cancel" onClick={onCancel}>Cancel</button>
        </div>
    )
}));

jest.mock('@/components/ui/tabs', () => ({
    // Simple implementation: tracks active tab via state, shows only active content
    Tabs: ({ children, defaultValue }: any) => {
        const [active, setActive] = React.useState(defaultValue);
        return (
            <div data-testid="tabs" data-active={active}>
                {React.Children.map(children, (child: any) =>
                    React.cloneElement(child, { activeTab: active, setActiveTab: setActive })
                )}
            </div>
        );
    },
    TabsList: ({ children, activeTab, setActiveTab }: any) => (
        <div data-testid="tabs-list">
            {React.Children.map(children, (child: any) =>
                React.cloneElement(child, { activeTab, setActiveTab })
            )}
        </div>
    ),
    TabsTrigger: ({ children, value, activeTab, setActiveTab }: any) => (
        <button
            data-testid={`tab-${value}`}
            aria-selected={activeTab === value}
            onClick={() => setActiveTab(value)}
        >
            {children}
        </button>
    ),
    TabsContent: ({ children, value, activeTab }: any) =>
        activeTab === value ? <div data-testid={`content-${value}`}>{children}</div> : null,
}));

jest.mock('@/components/ui/switch', () => ({
    Switch: ({ checked, onCheckedChange }: any) => (
        <button role="switch" aria-checked={checked} onClick={() => onCheckedChange(!checked)}>
            {checked ? 'ON' : 'OFF'}
        </button>
    )
}));

jest.mock('@/components/ui/button', () => ({
    Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>
}));

jest.mock('@/components/ui/card', () => ({
    Card: ({ children }: any) => <div>{children}</div>,
    CardHeader: ({ children }: any) => <div>{children}</div>,
    CardTitle: ({ children }: any) => <div>{children}</div>,
    CardDescription: ({ children }: any) => <div>{children}</div>,
    CardContent: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/ui/badge', () => ({
    Badge: ({ children }: any) => <div>{children}</div>
}));

describe('SmokeyRecommendsSection', () => {
    const mockOnToggle = jest.fn();
    const mockOnEdit = jest.fn();
    const defaultProps = {
        enabledPlaybooks: {},
        onPlaybookToggle: mockOnToggle,
        onPlaybookEdit: mockOnEdit,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders the section header', () => {
        render(<SmokeyRecommendsSection {...defaultProps} />);
        expect(screen.getByText('Smokey Recommends')).toBeInTheDocument();
        expect(screen.getByText('Automated Agent Playbooks')).toBeInTheDocument();
    });

    it('renders all three audience tabs', () => {
        render(<SmokeyRecommendsSection {...defaultProps} />);
        expect(screen.getByTestId('tab-dispensary')).toBeInTheDocument();
        expect(screen.getByTestId('tab-brand')).toBeInTheDocument();
        expect(screen.getByTestId('tab-customer')).toBeInTheDocument();
    });

    it('shows Dispensary tab content by default', () => {
        render(<SmokeyRecommendsSection {...defaultProps} />);
        // Dispensary content visible
        expect(screen.getByTestId('content-dispensary')).toBeInTheDocument();
        // Brand and Customer content NOT visible
        expect(screen.queryByTestId('content-brand')).not.toBeInTheDocument();
        expect(screen.queryByTestId('content-customer')).not.toBeInTheDocument();
    });

    it('shows Dispensary playbooks by default', () => {
        render(<SmokeyRecommendsSection {...defaultProps} />);
        expect(screen.getByText('Review Response Autopilot')).toBeInTheDocument();
    });

    it('switches to Brand tab and shows brand playbooks', () => {
        render(<SmokeyRecommendsSection {...defaultProps} />);
        fireEvent.click(screen.getByTestId('tab-brand'));
        expect(screen.getByTestId('content-brand')).toBeInTheDocument();
        expect(screen.queryByTestId('content-dispensary')).not.toBeInTheDocument();
        expect(screen.getByText('Price Violation Watch (MAP)')).toBeInTheDocument();
    });

    it('switches to Customer tab and shows customer playbooks', () => {
        render(<SmokeyRecommendsSection {...defaultProps} />);
        fireEvent.click(screen.getByTestId('tab-customer'));
        expect(screen.getByTestId('content-customer')).toBeInTheDocument();
        expect(screen.getByText('Deal Hunter')).toBeInTheDocument();
        expect(screen.getByText('Fresh Drop Alert')).toBeInTheDocument();
    });

    it('calls onPlaybookToggle when a disabled playbook switch is clicked via wizard', () => {
        render(<SmokeyRecommendsSection {...defaultProps} />);

        // Click first switch to open wizard
        const switches = screen.getAllByRole('switch');
        fireEvent.click(switches[0]);

        // Wizard should appear
        expect(screen.getByTestId('wizard')).toBeInTheDocument();

        // Complete the wizard — this should call onPlaybookToggle
        fireEvent.click(screen.getByTestId('wizard-complete'));

        expect(mockOnToggle).toHaveBeenCalledTimes(1);
        // Called with (playbookId, true, config)
        const [, enabled] = mockOnToggle.mock.calls[0];
        expect(enabled).toBe(true);
    });

    it('opens wizard when enabling a playbook', () => {
        render(<SmokeyRecommendsSection {...defaultProps} />);
        const switches = screen.getAllByRole('switch');
        fireEvent.click(switches[0]);
        expect(screen.getByTestId('wizard')).toBeInTheDocument();
    });

    it('calls onPlaybookToggle when an enabled playbook is turned off', () => {
        const enabledProps = {
            ...defaultProps,
            enabledPlaybooks: { review_response: { enabled: true, config: {} } },
        };
        render(<SmokeyRecommendsSection {...enabledProps} />);

        // The review_response playbook should have a switch with aria-checked=true
        const enabledSwitch = screen.getAllByRole('switch').find(
            (s) => s.getAttribute('aria-checked') === 'true'
        );
        expect(enabledSwitch).toBeDefined();

        // Toggle off — no wizard needed for disabling
        fireEvent.click(enabledSwitch!);

        expect(mockOnToggle).toHaveBeenCalledWith(
            expect.any(String), // playbookId
            false,
            undefined
        );
    });
});
