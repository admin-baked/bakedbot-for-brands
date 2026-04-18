import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AnalyticsBriefingArtifact } from '@/components/inbox/artifacts/analytics-briefing-artifact';
import { CheckinBriefingArtifact } from '@/components/inbox/artifacts/checkin-briefing-artifact';
import type { InboxArtifact } from '@/types/inbox';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockPush,
    }),
}));

function makeArtifact(
    overrides: Partial<InboxArtifact> & { data: InboxArtifact['data']; type: InboxArtifact['type'] }
): InboxArtifact {
    return {
        id: 'artifact-1',
        threadId: 'thread-1',
        orgId: 'org_thrive_syracuse',
        type: overrides.type,
        status: 'draft',
        data: overrides.data,
        createdAt: new Date('2026-04-18T08:00:00.000Z'),
        updatedAt: new Date('2026-04-18T08:00:00.000Z'),
        createdBy: 'test-user',
        ...overrides,
    };
}

describe('Inbox briefing artifacts', () => {
    beforeEach(() => {
        mockPush.mockReset();
    });

    it('renders analytics briefing safely with partial data', () => {
        const artifact = makeArtifact({
            type: 'analytics_briefing',
            data: {
                dayOfWeek: 'Saturday',
                emailDigest: {
                    unreadCount: 2,
                },
                meetings: [
                    {
                        source: 'google',
                    },
                ],
            } as InboxArtifact['data'],
        });

        render(<AnalyticsBriefingArtifact artifact={artifact} />);

        expect(screen.getByText("Saturday's Briefing - Today")).toBeInTheDocument();
        expect(screen.getByText('FYI')).toBeInTheDocument();
        expect(screen.getByText("Today's Meetings")).toBeInTheDocument();
        expect(screen.getByText('TBD')).toBeInTheDocument();
        expect(screen.getByText('Untitled meeting')).toBeInTheDocument();
        expect(screen.getByText('Inbox - 2 unread')).toBeInTheDocument();
        expect(screen.getByText('No new messages in this window.')).toBeInTheDocument();
    });

    it('routes the check-in review queue with a neutral operator prompt', () => {
        const artifact = makeArtifact({
            type: 'checkin_briefing',
            data: {
                periodLabel: 'Apr 18 update',
                generatedAt: '2026-04-18T08:00:00.000Z',
                reviewPendingCount: 3,
                moodBreakdown: [],
                todayCount: 5,
                weekCount: 12,
                monthCount: 44,
                todayNew: 2,
                todayReturning: 3,
                smsConsentRate: 67,
                emailConsentRate: 40,
                insight: 'Review follow-up is the main bottleneck.',
            } as InboxArtifact['data'],
        });

        render(<CheckinBriefingArtifact artifact={artifact} />);

        fireEvent.click(screen.getByRole('button', { name: /in day-3 review sequence/i }));

        expect(mockPush).toHaveBeenCalledTimes(1);
        const nextUrl = mockPush.mock.calls[0][0] as string;
        expect(nextUrl).toContain('/dashboard/inbox?');
        expect(nextUrl).toContain('agent=mrs_parker');
        expect(nextUrl).toContain('There+are+3+customers+in+the+Day-3+review+sequence');
        expect(nextUrl).not.toContain('Thrive+customers');
    });

    it('renders check-in briefing safely when counts and mood data are missing', () => {
        const artifact = makeArtifact({
            type: 'checkin_briefing',
            data: {
                generatedAt: '2026-04-18T08:00:00.000Z',
                insight: 'Quiet start to the day.',
            } as InboxArtifact['data'],
        });

        render(<CheckinBriefingArtifact artifact={artifact} />);

        expect(screen.getByText('Latest')).toBeInTheDocument();
        expect(screen.getAllByText('0').length).toBeGreaterThan(0);
        expect(screen.getByText('Quiet start to the day.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /manage check-in/i })).toBeInTheDocument();
    });
});
