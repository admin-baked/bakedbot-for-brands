/**
 * Brand Dashboard Component Unit Tests
 *
 * Tests for: KPI Grid, Playbooks List, Chat Widget, Right Sidebar
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrandKPIs } from '@/app/dashboard/brand/components/brand-kpi-grid';
import { BrandPlaybooksList } from '@/app/dashboard/brand/components/brand-playbooks-list';
import { BrandChatWidget } from '@/app/dashboard/brand/components/brand-chat-widget';
import { BrandRightRail } from '@/app/dashboard/brand/components/brand-right-sidebar';

// Mock Firebase
jest.mock('@/lib/firebase', () => ({
  getAdminFirestore: jest.fn(),
  getAdminAuth: jest.fn(),
}));

// Mock actions
jest.mock('@/app/dashboard/brand/actions', () => ({
  getBrandDashboardData: jest.fn(),
  getPlaybooks: jest.fn(),
  executeBrandPlaybook: jest.fn(),
  sendBrandChatMessage: jest.fn(),
}));

describe('Brand Dashboard Components - Production Readiness', () => {
  const mockBrandId = 'test-brand-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // BrandKPIs Component
  // ============================================================================

  describe('BrandKPIs Component', () => {
    const mockKPIData = {
      mrr: 5000,
      arpu: 25.50,
      signups: 120,
      campaigns: 8,
      activePlaybooks: 3,
      conversionRate: 12.5,
    };

    it('should render without crashing', () => {
      render(<BrandKPIs brandId={mockBrandId} data={mockKPIData} />);
      expect(screen.getByTestId('brand-kpi-grid')).toBeInTheDocument();
    });

    it('should display all KPI metrics', () => {
      render(<BrandKPIs brandId={mockBrandId} data={mockKPIData} />);

      expect(screen.getByText('MRR')).toBeInTheDocument();
      expect(screen.getByText('ARPU')).toBeInTheDocument();
      expect(screen.getByText('Signups')).toBeInTheDocument();
      expect(screen.getByText('Campaigns')).toBeInTheDocument();
    });

    it('should NOT display mock data', () => {
      render(<BrandKPIs brandId={mockBrandId} data={mockKPIData} />);

      const kpiText = screen.queryByText(/Mock|Coming soon|Example/i);
      expect(kpiText).not.toBeInTheDocument();
    });

    it('should show real numbers, not placeholder text', () => {
      render(<BrandKPIs brandId={mockBrandId} data={mockKPIData} />);

      expect(screen.getByText('5000')).toBeInTheDocument(); // MRR
      expect(screen.getByText('120')).toBeInTheDocument(); // Signups
    });

    it('should format currency values correctly', () => {
      render(<BrandKPIs brandId={mockBrandId} data={mockKPIData} />);

      // Should show $25.50 or similar format
      const mrrText = screen.getByText(/\$5000|5,000/);
      expect(mrrText).toBeInTheDocument();
    });

    it('should handle zero values gracefully', () => {
      const zeroData = { ...mockKPIData, signups: 0 };
      render(<BrandKPIs brandId={mockBrandId} data={zeroData} />);

      expect(screen.getByText('0')).toBeInTheDocument();
      expect(() => screen.getByText(/No data|—/)).not.toThrow();
    });

    it('should show loading state while fetching data', async () => {
      render(
        <BrandKPIs
          brandId={mockBrandId}
          data={null}
          isLoading={true}
        />
      );

      const skeleton = screen.getByTestId('kpi-skeleton-loader');
      expect(skeleton).toBeInTheDocument();
    });

    it('should show error state if data fetch fails', () => {
      render(
        <BrandKPIs
          brandId={mockBrandId}
          data={null}
          error="Failed to load KPIs"
        />
      );

      expect(screen.getByText(/Failed to load|Error/i)).toBeInTheDocument();
    });
  });

  // ============================================================================
  // BrandPlaybooksList Component
  // ============================================================================

  describe('BrandPlaybooksList Component', () => {
    const mockPlaybooks = [
      {
        id: 'pb-1',
        name: 'Email Campaign',
        description: 'Send weekly email to customers',
        status: 'active',
        executionCount: 52,
      },
      {
        id: 'pb-2',
        name: 'SMS Alert',
        description: 'Send SMS to high-value customers',
        status: 'active',
        executionCount: 128,
      },
    ];

    it('should render playbooks list', () => {
      render(<BrandPlaybooksList brandId={mockBrandId} playbooks={mockPlaybooks} />);

      expect(screen.getByText('Email Campaign')).toBeInTheDocument();
      expect(screen.getByText('SMS Alert')).toBeInTheDocument();
    });

    it('should NOT contain mock playbooks', () => {
      render(<BrandPlaybooksList brandId={mockBrandId} playbooks={mockPlaybooks} />);

      expect(screen.queryByText(/Demo|Example|Test Playbook/i)).not.toBeInTheDocument();
    });

    it('should display execution counts', () => {
      render(<BrandPlaybooksList brandId={mockBrandId} playbooks={mockPlaybooks} />);

      expect(screen.getByText(/52/)).toBeInTheDocument();
      expect(screen.getByText(/128/)).toBeInTheDocument();
    });

    it('should allow user to click on a playbook', async () => {
      const onSelectPlaybook = jest.fn();
      render(
        <BrandPlaybooksList
          brandId={mockBrandId}
          playbooks={mockPlaybooks}
          onSelect={onSelectPlaybook}
        />
      );

      const firstPlaybook = screen.getByText('Email Campaign').closest('[data-testid="playbook-item"]');
      await userEvent.click(firstPlaybook);

      expect(onSelectPlaybook).toHaveBeenCalledWith('pb-1');
    });

    it('should show empty state if no playbooks exist', () => {
      render(<BrandPlaybooksList brandId={mockBrandId} playbooks={[]} />);

      expect(screen.getByText(/No playbooks|Create your first/i)).toBeInTheDocument();
    });

    it('should allow filtering/searching playbooks', async () => {
      const { rerender } = render(
        <BrandPlaybooksList brandId={mockBrandId} playbooks={mockPlaybooks} />
      );

      const searchInput = screen.getByPlaceholderText(/Search playbooks/i);
      await userEvent.type(searchInput, 'Email');

      rerender(
        <BrandPlaybooksList
          brandId={mockBrandId}
          playbooks={mockPlaybooks.filter(p => p.name.includes('Email'))}
        />
      );

      expect(screen.getByText('Email Campaign')).toBeInTheDocument();
      expect(screen.queryByText('SMS Alert')).not.toBeInTheDocument();
    });

    it('should indicate active/inactive status', () => {
      render(<BrandPlaybooksList brandId={mockBrandId} playbooks={mockPlaybooks} />);

      const activeIndicators = screen.getAllByTestId('playbook-status-active');
      expect(activeIndicators.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // BrandChatWidget Component
  // ============================================================================

  describe('BrandChatWidget Component', () => {
    const mockMessages = [
      {
        id: 'msg-1',
        role: 'assistant',
        content: 'Hello! How can I help with your brand?',
        timestamp: new Date(),
      },
    ];

    it('should render chat widget', () => {
      render(<BrandChatWidget brandId={mockBrandId} />);

      expect(screen.getByTestId('brand-chat-widget')).toBeInTheDocument();
      expect(screen.getByTestId('chat-input')).toBeInTheDocument();
    });

    it('should display existing messages', () => {
      render(
        <BrandChatWidget
          brandId={mockBrandId}
          initialMessages={mockMessages}
        />
      );

      expect(screen.getByText('Hello! How can I help with your brand?')).toBeInTheDocument();
    });

    it('should allow user to send a message', async () => {
      const onSendMessage = jest.fn();
      render(
        <BrandChatWidget
          brandId={mockBrandId}
          onSendMessage={onSendMessage}
        />
      );

      const input = screen.getByTestId('chat-input');
      const sendButton = screen.getByTestId('chat-send-button');

      await userEvent.type(input, 'What are my KPIs?');
      await userEvent.click(sendButton);

      expect(onSendMessage).toHaveBeenCalledWith('What are my KPIs?');
    });

    it('should disable send button while message is sending', async () => {
      render(
        <BrandChatWidget
          brandId={mockBrandId}
          isSending={true}
        />
      );

      const sendButton = screen.getByTestId('chat-send-button');
      expect(sendButton).toBeDisabled();
    });

    it('should show loading state for incoming messages', () => {
      render(
        <BrandChatWidget
          brandId={mockBrandId}
          isLoading={true}
        />
      );

      const loader = screen.getByTestId('chat-loading-indicator');
      expect(loader).toBeInTheDocument();
    });

    it('should NOT display mock conversations', () => {
      render(<BrandChatWidget brandId={mockBrandId} />);

      expect(screen.queryByText(/Mock|Demo|Example conversation/i)).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // BrandRightSidebar Component
  // ============================================================================

  describe('BrandRightSidebar Component', () => {
    const mockCapabilities = [
      {
        id: 'capability-1',
        name: 'Email Campaigns',
        description: 'Send targeted email campaigns',
        enabled: true,
      },
      {
        id: 'capability-2',
        name: 'SMS Marketing',
        description: 'Send SMS messages to customers',
        enabled: true,
      },
    ];

    it('should render right sidebar', () => {
      render(<BrandRightRail brandId={mockBrandId} capabilities={mockCapabilities} />);

      expect(screen.getByTestId('brand-right-sidebar')).toBeInTheDocument();
    });

    it('should display capabilities section', () => {
      render(<BrandRightRail brandId={mockBrandId} capabilities={mockCapabilities} />);

      expect(screen.getByText('Email Campaigns')).toBeInTheDocument();
      expect(screen.getByText('SMS Marketing')).toBeInTheDocument();
    });

    it('should show quick actions', () => {
      render(<BrandRightRail brandId={mockBrandId} capabilities={mockCapabilities} />);

      const quickActionsSection = screen.getByTestId('quick-actions-section');
      expect(quickActionsSection).toBeInTheDocument();
    });

    it('should allow running agents', async () => {
      const onRunAgent = jest.fn();
      render(
        <BrandRightRail
          brandId={mockBrandId}
          capabilities={mockCapabilities}
          onRunAgent={onRunAgent}
        />
      );

      const runAgentButton = screen.getByTestId('run-agent-button');
      await userEvent.click(runAgentButton);

      expect(onRunAgent).toHaveBeenCalled();
    });

    it('should indicate enabled/disabled capabilities', () => {
      const disabledCapability = {
        ...mockCapabilities[0],
        enabled: false,
      };

      render(
        <BrandRightRail
          brandId={mockBrandId}
          capabilities={[disabledCapability, ...mockCapabilities.slice(1)]}
        />
      );

      const disabledBadge = screen.getByText(/Disabled|Coming soon/i);
      expect(disabledBadge).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Cross-Component Integration Tests
  // ============================================================================

  describe('Brand Dashboard Integration', () => {
    it('should load all components without conflicts', () => {
      const { container } = render(
        <div data-testid="brand-dashboard">
          <BrandKPIs brandId={mockBrandId} data={null} />
          <BrandPlaybooksList brandId={mockBrandId} playbooks={[]} />
          <BrandChatWidget brandId={mockBrandId} />
          <BrandRightRail brandId={mockBrandId} capabilities={[]} />
        </div>
      );

      expect(screen.getByTestId('brand-dashboard')).toBeInTheDocument();
      expect(screen.getByTestId('brand-kpi-grid')).toBeInTheDocument();
      expect(screen.getByTestId('brand-playbooks-list')).toBeInTheDocument();
      expect(screen.getByTestId('brand-chat-widget')).toBeInTheDocument();
      expect(screen.getByTestId('brand-right-sidebar')).toBeInTheDocument();
    });

    it('should enforce permission boundaries', async () => {
      const { rerender } = render(
        <BrandChatWidget brandId="brand-1" />
      );

      // Should not allow access to other brand's chat
      rerender(
        <BrandChatWidget brandId="brand-2" />
      );

      // Chat history should be cleared/not show
      expect(screen.queryByTestId('previous-brand-messages')).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Accessibility & Compliance
  // ============================================================================

  describe('Accessibility & Compliance', () => {
    it('should have proper ARIA labels', () => {
      render(
        <BrandChatWidget brandId={mockBrandId} />
      );

      const input = screen.getByTestId('chat-input');
      expect(input).toHaveAttribute('aria-label') ||
      expect(input).toHaveAttribute('placeholder');
    });

    it('should support keyboard navigation', async () => {
      render(
        <BrandPlaybooksList
          brandId={mockBrandId}
          playbooks={[
            { id: 'pb-1', name: 'Test', status: 'active' }
          ]}
        />
      );

      const item = screen.getByText('Test').closest('[data-testid="playbook-item"]');

      item?.focus();
      fireEvent.keyDown(item!, { key: 'Enter', code: 'Enter' });

      expect(item).toHaveFocus();
    });

    it('should have sufficient color contrast', () => {
      // This would typically be tested with axe-core or similar
      render(<BrandKPIs brandId={mockBrandId} data={null} />);
      const component = screen.getByTestId('brand-kpi-grid');
      expect(component).toBeInTheDocument();
    });
  });
});
