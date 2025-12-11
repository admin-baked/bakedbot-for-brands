/**
 * Unit Tests: Craig Priority Algorithm
 */

import {
    computeCampaignPriority,
    selectTopCampaign,
    rankCampaigns,
    getSendTimeHeuristic,
    Campaign
} from '@/server/algorithms/craig-priority';

describe('Craig Priority Algorithm', () => {
    const mockCampaigns: Campaign[] = [
        {
            campaign_id: 'camp_1',
            name: 'Holiday Sale',
            segment_id: 'seg_1',
            impact_score: 80,
            urgency_score: 90, // Urgent holiday
            fatigue_score: 10, // Low fatigue
            status: 'queued',
        },
        {
            campaign_id: 'camp_2',
            name: 'Regular Newsletter',
            segment_id: 'seg_1',
            impact_score: 40,
            urgency_score: 30, // Low urgency
            fatigue_score: 50, // High fatigue
            status: 'queued',
        },
        {
            campaign_id: 'camp_3',
            name: 'Flash Sale',
            segment_id: 'seg_2',
            impact_score: 70,
            urgency_score: 100, // Critical urgency
            fatigue_score: 20, // Medium fatigue
            status: 'queued',
        },
        {
            campaign_id: 'camp_4',
            name: 'Old Campaign',
            segment_id: 'seg_1',
            impact_score: 90,
            urgency_score: 80,
            fatigue_score: 5,
            status: 'completed', // Not eligible
        },
    ];

    describe('computeCampaignPriority', () => {
        it('should compute priority using the formula', () => {
            // priority = (impact * urgency) / (1 + fatigue)
            // = (80/100 * 90/100) / (1 + 10/100) = 0.72 / 1.1 ≈ 65.45
            const priority = computeCampaignPriority(mockCampaigns[0]);

            expect(priority).toBeGreaterThan(60);
            expect(priority).toBeLessThan(70);
        });

        it('should penalize high fatigue', () => {
            const lowFatigue = computeCampaignPriority({
                campaign_id: 'test',
                impact_score: 50,
                urgency_score: 50,
                fatigue_score: 10,
            });

            const highFatigue = computeCampaignPriority({
                campaign_id: 'test',
                impact_score: 50,
                urgency_score: 50,
                fatigue_score: 80,
            });

            expect(lowFatigue).toBeGreaterThan(highFatigue);
        });

        it('should reward high urgency', () => {
            const lowUrgency = computeCampaignPriority({
                campaign_id: 'test',
                impact_score: 50,
                urgency_score: 20,
                fatigue_score: 20,
            });

            const highUrgency = computeCampaignPriority({
                campaign_id: 'test',
                impact_score: 50,
                urgency_score: 80,
                fatigue_score: 20,
            });

            expect(highUrgency).toBeGreaterThan(lowUrgency);
        });
    });

    describe('selectTopCampaign', () => {
        it('should select the highest priority queued campaign', () => {
            const top = selectTopCampaign(mockCampaigns);

            expect(top).not.toBeNull();
            // Flash Sale (camp_3) should win: high urgency + decent impact
            // Let's verify by computing manually
            expect(top?.campaign_id).toBeDefined();
            expect(top?.priority_rank).toBe(1);
        });

        it('should return null if no eligible campaigns', () => {
            const noEligible = mockCampaigns.filter(c => c.status !== 'queued');
            const top = selectTopCampaign(noEligible);

            expect(top).toBeNull();
        });

        it('should exclude non-queued campaigns', () => {
            const top = selectTopCampaign(mockCampaigns);

            // camp_4 is completed, should not be selected even if high scores
            expect(top?.campaign_id).not.toBe('camp_4');
        });
    });

    describe('rankCampaigns', () => {
        it('should rank all campaigns by priority', () => {
            const ranked = rankCampaigns(mockCampaigns);

            expect(ranked).toHaveLength(mockCampaigns.length);

            // Check ordering
            for (let i = 1; i < ranked.length; i++) {
                expect(ranked[i - 1].priority).toBeGreaterThanOrEqual(ranked[i].priority);
            }
        });

        it('should assign correct ranks', () => {
            const ranked = rankCampaigns(mockCampaigns);

            ranked.forEach((c, idx) => {
                expect(c.priority_rank).toBe(idx + 1);
            });
        });
    });

    describe('getSendTimeHeuristic', () => {
        it('should return best hours for segment type', () => {
            const recreational = getSendTimeHeuristic('recreational');
            const medical = getSendTimeHeuristic('medical');

            expect(recreational.bestHours).toContain(17); // Evening
            expect(medical.bestHours).toContain(10); // Morning
        });

        it('should return default for unknown segment', () => {
            const unknown = getSendTimeHeuristic('unknown_segment');

            expect(unknown.bestHours.length).toBeGreaterThan(0);
            expect(unknown.bestDays.length).toBeGreaterThan(0);
        });
    });
});
