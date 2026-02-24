/**
 * Component tests for EzalOrgFrequency
 * (src/app/dashboard/ceo/components/ezal-org-frequency.tsx)
 *
 * Tests: rendering, frequency loading, preset button interactions, error states
 * Approach: mock server actions; pure RTL rendering; no real Firestore.
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { EzalOrgFrequency } from '@/app/dashboard/ceo/components/ezal-org-frequency';

// ---------------------------------------------------------------------------
// Mock server actions
// ---------------------------------------------------------------------------

jest.mock('@/app/dashboard/ceo/actions/system-actions', () => ({
    setCompetitiveIntelFrequency: jest.fn(),
    getCompetitiveIntelFrequency: jest.fn(),
}));

// Mock hooks
jest.mock('@/hooks/use-toast', () => ({
    useToast: () => ({ toast: jest.fn() }),
}));

// Mock UI components that aren't relevant to logic
jest.mock('@/components/ui/card', () => ({
    Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
    CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    CardHeader: ({ children, ...props }: { children: React.ReactNode; className?: string }) =>
        <div {...props}>{children}</div>,
    CardTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
    Button: ({ children, onClick, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) =>
        <button onClick={onClick} disabled={disabled} {...props}>{children}</button>,
}));

jest.mock('@/components/ui/select', () => ({
    Select: ({ children, onValueChange, value }: { children: React.ReactNode; onValueChange?: (v: string) => void; value?: string }) =>
        <div data-testid="select" data-value={value}>{children}</div>,
    SelectTrigger: ({ children }: { children: React.ReactNode }) =>
        <div data-testid="select-trigger">{children}</div>,
    SelectValue: ({ placeholder }: { placeholder?: string }) =>
        <span>{placeholder}</span>,
    SelectContent: ({ children }: { children: React.ReactNode }) =>
        <div data-testid="select-content">{children}</div>,
    SelectItem: ({ children, value, onClick }: { children: React.ReactNode; value: string; onClick?: () => void }) =>
        <div data-testid={`select-item-${value}`} onClick={onClick}>{children}</div>,
}));

jest.mock('@/components/ui/badge', () => ({
    Badge: ({ children }: { children: React.ReactNode }) => <span data-testid="badge">{children}</span>,
}));

jest.mock('lucide-react', () => ({
    Clock: () => <svg data-testid="clock-icon" />,
    RefreshCw: ({ className }: { className?: string }) => <svg data-testid="refresh-icon" className={className} />,
}));

import { setCompetitiveIntelFrequency, getCompetitiveIntelFrequency } from '@/app/dashboard/ceo/actions/system-actions';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const mockGetFreq = getCompetitiveIntelFrequency as jest.Mock;
const mockSetFreq = setCompetitiveIntelFrequency as jest.Mock;

function mockFrequencyResponse(
    preset: 'empire' | 'daily' | 'weekly' | 'monthly' | 'custom' | null,
    frequencyMinutes: number | null,
    sourceCount: number
) {
    mockGetFreq.mockResolvedValue({ preset, frequencyMinutes, sourceCount });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EzalOrgFrequency', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('initial render', () => {
        it('renders the card with title', async () => {
            mockFrequencyResponse('monthly', 43200, 5);
            render(<EzalOrgFrequency />);
            expect(screen.getByText('Competitive Intel Frequency')).toBeInTheDocument();
        });

        it('renders org selector with Thrive Syracuse as default', async () => {
            mockFrequencyResponse('monthly', 43200, 5);
            render(<EzalOrgFrequency />);
            expect(screen.getByTestId('select')).toBeInTheDocument();
        });

        it('renders refresh button', async () => {
            mockFrequencyResponse('monthly', 43200, 5);
            render(<EzalOrgFrequency />);
            expect(screen.getByTestId('refresh-icon')).toBeInTheDocument();
        });

        it('calls getCompetitiveIntelFrequency on mount', async () => {
            mockFrequencyResponse('monthly', 43200, 5);
            render(<EzalOrgFrequency />);
            await waitFor(() => {
                expect(mockGetFreq).toHaveBeenCalledTimes(1);
                expect(mockGetFreq).toHaveBeenCalledWith('org_thrive_syracuse');
            });
        });
    });

    describe('source count display', () => {
        it('shows source count after loading', async () => {
            mockFrequencyResponse('monthly', 43200, 5);
            render(<EzalOrgFrequency />);
            await waitFor(() => {
                expect(screen.getByText('5 sources')).toBeInTheDocument();
            });
        });

        it('shows singular "source" for count of 1', async () => {
            mockFrequencyResponse('empire', 15, 1);
            render(<EzalOrgFrequency />);
            await waitFor(() => {
                expect(screen.getByText('1 source')).toBeInTheDocument();
            });
        });

        it('shows "No data sources" message when sourceCount is 0', async () => {
            mockFrequencyResponse(null, null, 0);
            render(<EzalOrgFrequency />);
            await waitFor(() => {
                expect(screen.getByText(/No data sources configured/)).toBeInTheDocument();
            });
        });
    });

    describe('current frequency display', () => {
        it('shows "Current:" label when sources exist', async () => {
            mockFrequencyResponse('monthly', 43200, 5);
            render(<EzalOrgFrequency />);
            await waitFor(() => {
                expect(screen.getByText('Current:')).toBeInTheDocument();
            });
        });

        it('shows empire preset label when frequency is 15 min', async () => {
            mockFrequencyResponse('empire', 15, 4);
            render(<EzalOrgFrequency />);
            await waitFor(() => {
                // 'Empire (15 min)' appears in both the badge and the button when empire is active
                expect(screen.getAllByText('Empire (15 min)').length).toBeGreaterThan(0);
            });
        });

        it('shows monthly preset label when frequency is 43200 min', async () => {
            mockFrequencyResponse('monthly', 43200, 5);
            render(<EzalOrgFrequency />);
            await waitFor(() => {
                // 'Monthly' appears in both the current badge and the preset button when active
                expect(screen.getAllByText('Monthly').length).toBeGreaterThan(0);
            });
        });

        it('shows custom frequency in minutes when not a preset', async () => {
            mockFrequencyResponse('custom', 720, 3);
            render(<EzalOrgFrequency />);
            await waitFor(() => {
                expect(screen.getByText(/720 min/)).toBeInTheDocument();
            });
        });
    });

    describe('preset buttons', () => {
        it('renders all 4 preset options when sources exist', async () => {
            // Use 'custom' so no preset badge text conflicts with button labels
            mockFrequencyResponse('custom', 720, 5);
            render(<EzalOrgFrequency />);
            await waitFor(() => {
                expect(screen.getByText('Empire (15 min)')).toBeInTheDocument();
                expect(screen.getByText('Daily')).toBeInTheDocument();
                expect(screen.getByText('Weekly')).toBeInTheDocument();
                expect(screen.getByText('Monthly')).toBeInTheDocument();
            });
        });

        it('does not render preset buttons when no sources', async () => {
            mockFrequencyResponse(null, null, 0);
            render(<EzalOrgFrequency />);
            await waitFor(() => {
                expect(screen.queryByText('Empire (15 min)')).not.toBeInTheDocument();
            });
        });

        it('calls setCompetitiveIntelFrequency with empire preset on Empire button click', async () => {
            // First call (mount): monthly is active → Empire button is enabled
            // Second call (after update): empire
            mockGetFreq
                .mockResolvedValueOnce({ preset: 'monthly', frequencyMinutes: 43200, sourceCount: 5 })
                .mockResolvedValueOnce({ preset: 'empire', frequencyMinutes: 15, sourceCount: 5 });
            mockSetFreq.mockResolvedValue({ message: 'Updated 5 sources', updatedCount: 5 });

            render(<EzalOrgFrequency />);

            // Wait for Monthly to load (meaning Empire button is NOT disabled)
            await waitFor(() => screen.getAllByText('Empire (15 min)'));

            // Click the Empire button (the preset button, not a badge — grab the last one which is the button)
            const empireButtons = screen.getAllByText('Empire (15 min)');
            fireEvent.click(empireButtons[empireButtons.length - 1]);

            await waitFor(() => {
                expect(mockSetFreq).toHaveBeenCalledWith('org_thrive_syracuse', 'empire');
            });
        });

        it('calls setCompetitiveIntelFrequency with monthly preset on Monthly button click', async () => {
            mockFrequencyResponse('empire', 15, 4);
            mockSetFreq.mockResolvedValue({ message: 'Updated 4 sources', updatedCount: 4 });
            mockGetFreq
                .mockResolvedValueOnce({ preset: 'empire', frequencyMinutes: 15, sourceCount: 4 })
                .mockResolvedValueOnce({ preset: 'monthly', frequencyMinutes: 43200, sourceCount: 4 });

            render(<EzalOrgFrequency />);
            await waitFor(() => screen.getByText('Monthly'));

            const monthlyButtons = screen.getAllByText('Monthly');
            fireEvent.click(monthlyButtons[monthlyButtons.length - 1]); // Click the button (not current label)

            await waitFor(() => {
                expect(mockSetFreq).toHaveBeenCalledWith('org_thrive_syracuse', 'monthly');
            });
        });

        it('refreshes frequency display after successful update', async () => {
            mockFrequencyResponse('monthly', 43200, 5);
            mockSetFreq.mockResolvedValue({ message: 'Updated', updatedCount: 5 });
            // After setting, return empire
            mockGetFreq
                .mockResolvedValueOnce({ preset: 'monthly', frequencyMinutes: 43200, sourceCount: 5 })
                .mockResolvedValueOnce({ preset: 'empire', frequencyMinutes: 15, sourceCount: 5 });

            render(<EzalOrgFrequency />);
            await waitFor(() => screen.getByText('Empire (15 min)'));

            fireEvent.click(screen.getAllByText('Empire (15 min)')[0]);

            await waitFor(() => {
                // getCompetitiveIntelFrequency should have been called twice: mount + after update
                expect(mockGetFreq).toHaveBeenCalledTimes(2);
            });
        });
    });

    describe('preset descriptions', () => {
        it('shows description for each preset button', async () => {
            mockFrequencyResponse('weekly', 10080, 3);
            render(<EzalOrgFrequency />);
            await waitFor(() => {
                expect(screen.getByText('Real-time monitoring — paid tier')).toBeInTheDocument();
                expect(screen.getByText('Once per day refresh')).toBeInTheDocument();
                expect(screen.getByText('Once per week refresh')).toBeInTheDocument();
                expect(screen.getByText('Once per month — free/testing')).toBeInTheDocument();
            });
        });
    });

    describe('loading state', () => {
        it('shows loading text while fetching', async () => {
            // Never resolve to keep loading state
            mockGetFreq.mockImplementation(() => new Promise(() => {}));
            render(<EzalOrgFrequency />);
            expect(screen.getByText('Loading...')).toBeInTheDocument();
        });
    });

    describe('saving state', () => {
        it('shows Updating... during save', async () => {
            mockFrequencyResponse('monthly', 43200, 5);
            // setCompetitiveIntelFrequency never resolves (keep saving state)
            mockSetFreq.mockImplementation(() => new Promise(() => {}));

            render(<EzalOrgFrequency />);
            await waitFor(() => screen.getByText('Empire (15 min)'));

            fireEvent.click(screen.getAllByText('Empire (15 min)')[0]);

            await waitFor(() => {
                expect(screen.getByText('Updating...')).toBeInTheDocument();
            });
        });
    });
});
