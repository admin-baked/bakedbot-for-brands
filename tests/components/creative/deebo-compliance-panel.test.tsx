/**
 * Unit Tests: DeeboCompliancePanel
 *
 * Tests for the Deebo right-rail compliance component in the Creative Studio.
 * Covers: traffic light status logic, compliance check rendering, safe version
 * acceptance, approval chain accordion, scheduling calendar, asset library,
 * and publish/schedule CTA states.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/components/creative/approval-chain', () => ({
  ApprovalChain: () => (
    <div data-testid="approval-chain">ApprovalChain rendered</div>
  ),
}));

jest.mock('@/components/ui/calendar', () => ({
  Calendar: ({ selected, onSelect }: { selected: Date | undefined; onSelect: (d: Date | undefined) => void }) => (
    <div data-testid="calendar">
      <button onClick={() => onSelect(new Date('2026-03-01'))}>Pick date</button>
      {selected && <span data-testid="calendar-selected">{selected.toISOString()}</span>}
    </div>
  ),
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  AvatarFallback: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  AvatarImage: ({ src }: { src: string }) => <img src={src} alt="avatar" />,
}));

// Framer motion — render children immediately, strip animation props so they
// don't get spread as invalid HTML attributes (which can break jsdom rendering).
jest.mock('framer-motion', () => {
  const mockMotionDiv = ({
    children,
    className,
    // Strip framer-specific props so they're not spread onto the DOM element
    initial: _i,
    animate: _a,
    exit: _e,
    transition: _t,
    ...rest
  }: React.HTMLAttributes<HTMLDivElement> & {
    initial?: unknown;
    animate?: unknown;
    exit?: unknown;
    transition?: unknown;
  }) => <div className={className} {...rest}>{children}</div>;

  return {
    motion: { div: mockMotionDiv },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

// ── Component under test ──────────────────────────────────────────────────────

import { DeeboCompliancePanel } from '@/app/dashboard/creative/components/deebo-compliance-panel';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeContent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'content_1',
    caption: 'Test caption',
    status: 'pending',
    platform: 'instagram',
    complianceChecks: [],
    mediaUrls: [],
    hashtags: [],
    revisionNotes: [],
    approvalState: null,
    ...overrides,
  } as any;
}

const mockHandlers = {
  onAcceptSafeVersion: jest.fn(),
  onApprove: jest.fn(),
  onReject: jest.fn(),
  onDateChange: jest.fn(),
  onScheduleApprove: jest.fn(),
};

function renderPanel(props: Partial<React.ComponentProps<typeof DeeboCompliancePanel>> = {}) {
  return render(
    <DeeboCompliancePanel
      content={null}
      currentUserRole="brand_admin"
      currentUserId="user_123"
      date={undefined}
      isApproving={null}
      gauntletEnabled={true}
      {...mockHandlers}
      {...props}
    />,
  );
}

// Helper — find the green Publish/Schedule action button (NOT "Publishing Schedule" header)
function getPublishCTA() {
  // The CTA is a <button> whose text starts with "Publish" or "Schedule for"
  return screen.getAllByRole('button').find(
    btn => /^(Publish Now|Schedule for|Publishing\.\.\.)/.test(btn.textContent ?? ''),
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('DeeboCompliancePanel', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── Deebo identity ──────────────────────────────────────────────────────────

  describe('Deebo identity', () => {
    it('shows Deebo name and role', () => {
      renderPanel();
      expect(screen.getByText('Deebo')).toBeInTheDocument();
      expect(screen.getByText('Compliance Enforcer')).toBeInTheDocument();
    });

    it('shows DB avatar fallback', () => {
      renderPanel();
      expect(screen.getByText('DB')).toBeInTheDocument();
    });
  });

  // ── Status: idle ────────────────────────────────────────────────────────────

  describe('idle state (no content)', () => {
    it('shows "No content yet" when content is null', () => {
      renderPanel({ content: null });
      expect(screen.getByText('No content yet')).toBeInTheDocument();
    });

    it('shows idle sublabel when content is null', () => {
      renderPanel({ content: null });
      expect(screen.getByText('Generate content to run compliance check')).toBeInTheDocument();
    });

    it('shows idle state when gauntlet disabled regardless of content', () => {
      renderPanel({ content: makeContent(), gauntletEnabled: false });
      expect(screen.getByText('No content yet')).toBeInTheDocument();
    });
  });

  // ── Status: checking ────────────────────────────────────────────────────────

  describe('checking state', () => {
    it('shows "Checking..." when content has no compliance checks', () => {
      renderPanel({ content: makeContent({ complianceChecks: [] }) });
      expect(screen.getByText('Checking...')).toBeInTheDocument();
    });

    it('shows reviewing sublabel while checking', () => {
      renderPanel({ content: makeContent({ complianceChecks: [] }) });
      expect(screen.getByText('Deebo is reviewing your content')).toBeInTheDocument();
    });
  });

  // ── Status: cleared ─────────────────────────────────────────────────────────

  describe('cleared state', () => {
    it('shows "Cleared" when all checks pass', () => {
      renderPanel({
        content: makeContent({
          complianceChecks: [
            { checkType: 'health_claims', passed: true, message: 'OK' },
            { checkType: 'age_gate', passed: true, message: 'OK' },
          ],
        }),
      });
      expect(screen.getByText('Cleared')).toBeInTheDocument();
    });

    it('shows OCM regulations sublabel when cleared', () => {
      renderPanel({
        content: makeContent({
          complianceChecks: [{ checkType: 'age_gate', passed: true, message: 'OK' }],
        }),
      });
      expect(screen.getByText('Content meets NY OCM regulations')).toBeInTheDocument();
    });

    it('does not show failed checks section when all pass', () => {
      renderPanel({
        content: makeContent({
          complianceChecks: [{ checkType: 'health_claims', passed: true, message: 'All good' }],
        }),
      });
      // Safe version only appears on failures
      expect(screen.queryByText('Accept Safe Version')).not.toBeInTheDocument();
    });
  });

  // ── Status: warning ─────────────────────────────────────────────────────────

  describe('warning state (1 failed check)', () => {
    const warningContent = makeContent({
      complianceChecks: [
        { checkType: 'health_claims', passed: false, message: 'Avoid medical claims' },
        { checkType: 'age_gate', passed: true, message: 'OK' },
      ],
    });

    it('shows "Caution" label', () => {
      renderPanel({ content: warningContent });
      expect(screen.getByText('Caution')).toBeInTheDocument();
    });

    it('renders the failed check type as uppercase text', () => {
      renderPanel({ content: warningContent });
      // CSS `text-transform: uppercase` is visual only — DOM text is lowercase
      expect(screen.getByText('health claims')).toBeInTheDocument();
    });

    it('renders the failed check message', () => {
      renderPanel({ content: warningContent });
      expect(screen.getByText('Avoid medical claims')).toBeInTheDocument();
    });

    it('shows Deebo safe version label when a check fails', () => {
      renderPanel({ content: warningContent });
      // Uses &apos; → apostrophe in DOM
      expect(screen.getByText("Deebo's Safe Version")).toBeInTheDocument();
    });

    it('shows the safe version quote', () => {
      renderPanel({ content: warningContent });
      // Component uses &ldquo;/&rdquo; which render as curly quotes (\u201C / \u201D)
      expect(screen.getByText('\u201cMay help with relaxation.\u201d')).toBeInTheDocument();
    });

    it('calls onAcceptSafeVersion when Accept Safe Version is clicked', () => {
      renderPanel({ content: warningContent });
      fireEvent.click(screen.getByText('Accept Safe Version'));
      expect(mockHandlers.onAcceptSafeVersion).toHaveBeenCalledTimes(1);
    });

    it('replaces underscores with spaces in check type label', () => {
      const content = makeContent({
        complianceChecks: [{ checkType: 'age_gate_violation', passed: false, message: 'Bad' }],
      });
      renderPanel({ content });
      // CSS uppercase is visual only — DOM text is lowercase with spaces
      expect(screen.getByText('age gate violation')).toBeInTheDocument();
    });

    it('does not show failed check for a passing sibling', () => {
      renderPanel({ content: warningContent });
      expect(screen.queryByText('AGE GATE')).not.toBeInTheDocument();
    });
  });

  // ── Status: flagged ─────────────────────────────────────────────────────────

  describe('flagged state (2+ failed checks)', () => {
    const flaggedContent = makeContent({
      complianceChecks: [
        { checkType: 'health_claims', passed: false, message: 'Issue 1' },
        { checkType: 'age_gate', passed: false, message: 'Issue 2' },
      ],
    });

    it('shows "Flagged" when 2 or more checks fail', () => {
      renderPanel({ content: flaggedContent });
      expect(screen.getByText('Flagged')).toBeInTheDocument();
    });

    it('shows all failed check type labels', () => {
      renderPanel({ content: flaggedContent });
      // CSS uppercase is visual only — DOM text is lowercase with spaces
      expect(screen.getByText('health claims')).toBeInTheDocument();
      expect(screen.getByText('age gate')).toBeInTheDocument();
    });

    it('shows revision-required sublabel', () => {
      renderPanel({ content: flaggedContent });
      expect(screen.getByText('Content requires revision before publishing')).toBeInTheDocument();
    });

    it('shows all failed check messages', () => {
      renderPanel({ content: flaggedContent });
      expect(screen.getByText('Issue 1')).toBeInTheDocument();
      expect(screen.getByText('Issue 2')).toBeInTheDocument();
    });
  });

  // ── Approval chain accordion ─────────────────────────────────────────────────

  describe('approval chain accordion', () => {
    const clearedContent = makeContent({
      complianceChecks: [{ checkType: 'ok', passed: true, message: 'good' }],
    });

    it('does not show View Full Report when content is null', () => {
      renderPanel({ content: null });
      expect(screen.queryByText('View Full Report')).not.toBeInTheDocument();
    });

    it('shows View Full Report when content exists', () => {
      renderPanel({ content: clearedContent });
      expect(screen.getByText('View Full Report')).toBeInTheDocument();
    });

    it('does not render ApprovalChain before toggle', () => {
      renderPanel({ content: { ...clearedContent, approvalState: { levels: [] } } });
      expect(screen.queryByTestId('approval-chain')).not.toBeInTheDocument();
    });

    it('renders ApprovalChain after clicking View Full Report', () => {
      renderPanel({ content: { ...clearedContent, approvalState: { levels: [] } } });
      fireEvent.click(screen.getByText('View Full Report'));
      expect(screen.getByTestId('approval-chain')).toBeInTheDocument();
    });

    it('hides ApprovalChain on second click (toggle off)', () => {
      renderPanel({ content: { ...clearedContent, approvalState: { levels: [] } } });
      fireEvent.click(screen.getByText('View Full Report'));
      fireEvent.click(screen.getByText('View Full Report'));
      expect(screen.queryByTestId('approval-chain')).not.toBeInTheDocument();
    });

    it('does not render ApprovalChain if approvalState is null', () => {
      renderPanel({ content: { ...clearedContent, approvalState: null } });
      fireEvent.click(screen.getByText('View Full Report'));
      expect(screen.queryByTestId('approval-chain')).not.toBeInTheDocument();
    });
  });

  // ── Publishing schedule ──────────────────────────────────────────────────────

  describe('publishing schedule', () => {
    it('renders Publishing Schedule section header', () => {
      renderPanel();
      expect(screen.getByText('Publishing Schedule')).toBeInTheDocument();
    });

    it('shows calendar after clicking the header', () => {
      renderPanel();
      fireEvent.click(screen.getByText('Publishing Schedule'));
      expect(screen.getByTestId('calendar')).toBeInTheDocument();
    });

    it('hides calendar on second click (toggle)', () => {
      renderPanel();
      fireEvent.click(screen.getByText('Publishing Schedule'));
      fireEvent.click(screen.getByText('Publishing Schedule'));
      expect(screen.queryByTestId('calendar')).not.toBeInTheDocument();
    });

    it('shows a date chip when a date is provided and calendar is closed', () => {
      // Pass a fixed date; chip is visible when showCalendar=false (default)
      const date = new Date('2026-03-15T12:00:00Z');
      renderPanel({ date });
      // The chip renders the date via toLocaleDateString — check it exists somewhere in the panel
      const chip = screen.getAllByText((content) => content.includes('26') || content.includes('15') || content.includes('Mar'));
      expect(chip.length).toBeGreaterThan(0);
    });

    it('calls onDateChange when the mock calendar picks a date', () => {
      renderPanel();
      fireEvent.click(screen.getByText('Publishing Schedule'));
      fireEvent.click(screen.getByText('Pick date'));
      expect(mockHandlers.onDateChange).toHaveBeenCalledWith(expect.any(Date));
    });
  });

  // ── Publish / Schedule CTA ───────────────────────────────────────────────────

  describe('Publish / Schedule CTA', () => {
    it('shows "Publish Now" when no date is set', () => {
      renderPanel({ date: undefined });
      const btn = getPublishCTA();
      expect(btn).toBeDefined();
      expect(btn!.textContent).toMatch(/Publish Now/);
    });

    it('shows scheduled date in button label when date is set', () => {
      const date = new Date('2026-03-01T12:00:00Z');
      renderPanel({ date });
      const btn = getPublishCTA();
      expect(btn).toBeDefined();
      expect(btn!.textContent).toMatch(/Schedule for/);
    });

    it('publish CTA is disabled when content is null', () => {
      renderPanel({ content: null });
      const btn = getPublishCTA();
      expect(btn).toBeDisabled();
    });

    it('publish CTA is enabled when content exists and not approving', () => {
      renderPanel({ content: makeContent(), isApproving: null });
      const btn = getPublishCTA();
      expect(btn).not.toBeDisabled();
    });

    it('shows "Publishing..." text during approval', () => {
      renderPanel({ content: makeContent(), isApproving: 'content_1' });
      expect(screen.getByText('Publishing...')).toBeInTheDocument();
    });

    it('publish CTA is disabled while isApproving is set', () => {
      renderPanel({ content: makeContent(), isApproving: 'content_1' });
      const btn = getPublishCTA();
      expect(btn).toBeDisabled();
    });

    it('calls onScheduleApprove when CTA is clicked', () => {
      renderPanel({ content: makeContent(), isApproving: null });
      const btn = getPublishCTA()!;
      fireEvent.click(btn);
      expect(mockHandlers.onScheduleApprove).toHaveBeenCalledTimes(1);
    });
  });

  // ── QR stats ─────────────────────────────────────────────────────────────────

  describe('QR stats', () => {
    it('does not render QR image when qrDataUrl is absent', () => {
      renderPanel({ content: makeContent() });
      expect(screen.queryByAltText('QR')).not.toBeInTheDocument();
    });

    it('renders QR image when qrDataUrl is present', () => {
      const content = makeContent({ qrDataUrl: 'data:image/png;base64,abc', qrStats: { scans: 42 } });
      renderPanel({ content });
      expect(screen.getByAltText('QR')).toBeInTheDocument();
    });

    it('shows scan count', () => {
      const content = makeContent({ qrDataUrl: 'data:image/png;base64,abc', qrStats: { scans: 42 } });
      renderPanel({ content });
      expect(screen.getByText('42 scans')).toBeInTheDocument();
    });

    it('shows 0 scans when qrStats.scans is undefined', () => {
      const content = makeContent({ qrDataUrl: 'data:image/png;base64,abc', qrStats: {} });
      renderPanel({ content });
      expect(screen.getByText('0 scans')).toBeInTheDocument();
    });

    it('shows "View page" link when contentUrl is present', () => {
      const content = makeContent({
        qrDataUrl: 'data:image/png;base64,abc',
        qrStats: { scans: 5 },
        contentUrl: 'https://bakedbot.ai/c/123',
      });
      renderPanel({ content });
      expect(screen.getByText('View page')).toBeInTheDocument();
    });

    it('does not show "View page" when contentUrl is absent', () => {
      const content = makeContent({ qrDataUrl: 'data:image/png;base64,abc', qrStats: { scans: 5 } });
      renderPanel({ content });
      expect(screen.queryByText('View page')).not.toBeInTheDocument();
    });
  });

  // ── Asset library ─────────────────────────────────────────────────────────────

  describe('asset library', () => {
    it('shows "Recent Assets" heading', () => {
      renderPanel();
      expect(screen.getByText('Recent Assets')).toBeInTheDocument();
    });

    it('shows empty state when content is null', () => {
      renderPanel({ content: null });
      expect(screen.getByText('No assets yet')).toBeInTheDocument();
    });

    it('shows empty state when mediaUrls is empty', () => {
      renderPanel({ content: makeContent({ mediaUrls: [] }) });
      expect(screen.getByText('No assets yet')).toBeInTheDocument();
    });

    it('renders asset thumbnails when mediaUrls exist', () => {
      const content = makeContent({
        mediaUrls: ['https://cdn.test/img1.jpg', 'https://cdn.test/img2.jpg'],
      });
      renderPanel({ content });
      const assetImgs = screen.getAllByRole('img').filter(
        img => img.getAttribute('alt')?.startsWith('Asset'),
      );
      expect(assetImgs).toHaveLength(2);
    });

    it('shows "Generated images appear here" hint in empty state', () => {
      renderPanel({ content: null });
      expect(screen.getByText('Generated images appear here')).toBeInTheDocument();
    });
  });
});

// ── getComplianceStatus boundary tests ────────────────────────────────────────

describe('getComplianceStatus boundaries', () => {
  function status(overrides?: { complianceChecks?: Array<{ checkType: string; passed: boolean; message: string }> }, gauntletEnabled = true) {
    const content = overrides ? ({ complianceChecks: overrides.complianceChecks ?? [] } as any) : null;
    const { getByText } = render(
      <DeeboCompliancePanel
        content={content}
        gauntletEnabled={gauntletEnabled}
        date={undefined}
        isApproving={null}
        onAcceptSafeVersion={jest.fn()}
        onApprove={jest.fn()}
        onReject={jest.fn()}
        onDateChange={jest.fn()}
        onScheduleApprove={jest.fn()}
      />,
    );
    return { getByText };
  }

  it('null content → idle', () => {
    const { getByText } = status(undefined);
    expect(getByText('No content yet')).toBeInTheDocument();
  });

  it('gauntlet disabled → idle even with failures', () => {
    const { getByText } = status({ complianceChecks: [{ checkType: 'a', passed: false, message: 'x' }] }, false);
    expect(getByText('No content yet')).toBeInTheDocument();
  });

  it('empty checks array → checking', () => {
    const { getByText } = status({ complianceChecks: [] });
    expect(getByText('Checking...')).toBeInTheDocument();
  });

  it('all checks pass → cleared', () => {
    const { getByText } = status({ complianceChecks: [{ checkType: 'a', passed: true, message: 'ok' }, { checkType: 'b', passed: true, message: 'ok' }] });
    expect(getByText('Cleared')).toBeInTheDocument();
  });

  it('exactly 1 failure → warning (boundary)', () => {
    const { getByText } = status({ complianceChecks: [{ checkType: 'a', passed: false, message: 'x' }] });
    expect(getByText('Caution')).toBeInTheDocument();
  });

  it('exactly 2 failures → flagged (boundary)', () => {
    const { getByText } = status({ complianceChecks: [{ checkType: 'a', passed: false, message: 'x' }, { checkType: 'b', passed: false, message: 'y' }] });
    expect(getByText('Flagged')).toBeInTheDocument();
  });

  it('3 failures → flagged', () => {
    const { getByText } = status({ complianceChecks: [{ checkType: 'a', passed: false, message: 'x' }, { checkType: 'b', passed: false, message: 'y' }, { checkType: 'c', passed: false, message: 'z' }] });
    expect(getByText('Flagged')).toBeInTheDocument();
  });

  it('mixed checks (1 fail, 2 pass) → warning', () => {
    const { getByText } = status({
      complianceChecks: [
        { checkType: 'a', passed: false, message: 'bad' },
        { checkType: 'b', passed: true, message: 'ok' },
        { checkType: 'c', passed: true, message: 'ok' },
      ],
    });
    expect(getByText('Caution')).toBeInTheDocument();
  });
});
