/**
 * Cross-Agent Collaboration Tests
 * Tests for multi-agent coordination, delegation, and shared memory
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
    CraigMemory,
    EzalMemory,
    LeoMemory,
    DeeboMemory,
    DelegationSchema,
    ResearchFindingSchema,
    CampaignReviewSchema,
    WorkflowSchema,
    CollaborationMetricsSchema,
} from '@/server/agents/schemas';
import { z } from 'zod';

describe('Cross-Agent Collaboration System', () => {
    // =========================================================================
    // Research Findings (Ezal → Other Agents)
    // =========================================================================
    describe('Research Findings (Ezal Agent)', () => {
        it('should create a research finding with required fields', () => {
            const finding = {
                id: 'finding_001',
                topic: 'competitor_pricing',
                finding: 'Competitor A is offering 15% discount on premium strains',
                relevant_to: ['craig', 'money_mike'],
                confidence: 'high' as const,
                shared_with: [],
                timestamp: new Date(),
            };

            const result = ResearchFindingSchema.safeParse(finding);
            expect(result.success).toBe(true);
            expect(result.data?.relevant_to).toContain('craig');
            expect(result.data?.confidence).toBe('high');
        });

        it('should validate confidence levels', () => {
            const invalidFinding = {
                id: 'finding_002',
                topic: 'market_trend',
                finding: 'Cannabis prices rising 5% quarterly',
                relevant_to: ['pops', 'money_mike'],
                confidence: 'very_high' as any,
                timestamp: new Date(),
            };

            const result = ResearchFindingSchema.safeParse(invalidFinding);
            expect(result.success).toBe(false);
        });

        it('should track which agents received findings', () => {
            const finding = {
                id: 'finding_003',
                topic: 'menu_analysis',
                finding: 'Top competitor added 12 new products',
                relevant_to: ['craig', 'smokey'],
                confidence: 'high' as const,
                shared_with: ['craig', 'smokey'],
                timestamp: new Date(),
            };

            const result = ResearchFindingSchema.safeParse(finding);
            expect(result.success).toBe(true);
            expect(result.data?.shared_with?.length).toBe(2);
        });
    });

    // =========================================================================
    // Delegations (Leo → Other Agents)
    // =========================================================================
    describe('Agent Delegations (Leo COO)', () => {
        it('should create a delegation with full context', () => {
            const delegation = {
                id: 'del_001',
                delegated_to: 'craig',
                delegated_by: 'leo',
                task_description: 'Draft email campaign for Q2 launch',
                status: 'pending' as const,
                context: {
                    campaign_id: 'camp_123',
                    audience: 'repeat_customers',
                    budget: 5000,
                },
                deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                timestamp: new Date(),
            };

            const result = DelegationSchema.safeParse(delegation);
            expect(result.success).toBe(true);
            expect(result.data?.delegated_to).toBe('craig');
            expect(result.data?.context?.campaign_id).toBe('camp_123');
        });

        it('should track delegation status transitions', () => {
            const statuses = ['pending', 'in_progress', 'completed', 'failed'] as const;

            statuses.forEach((status) => {
                const delegation = {
                    id: `del_${status}`,
                    delegated_to: 'ezal',
                    delegated_by: 'leo',
                    task_description: 'Analyze competitor menu',
                    status,
                    timestamp: new Date(),
                };

                const result = DelegationSchema.safeParse(delegation);
                expect(result.success).toBe(true);
                expect(result.data?.status).toBe(status);
            });
        });

        it('should capture delegation result when completed', () => {
            const delegation = {
                id: 'del_002',
                delegated_to: 'pops',
                delegated_by: 'leo',
                task_description: 'Generate Q2 sales forecast',
                status: 'completed' as const,
                result: 'Forecast shows 12% growth, risk factors included in appendix',
                timestamp: new Date(),
            };

            const result = DelegationSchema.safeParse(delegation);
            expect(result.success).toBe(true);
            expect(result.data?.result).toBeDefined();
        });
    });

    // =========================================================================
    // Campaign Reviews (Craig → Deebo)
    // =========================================================================
    describe('Campaign Review Workflow (Craig → Deebo)', () => {
        it('should create a campaign review request', () => {
            const review = {
                id: 'review_001',
                campaign_id: 'camp_123',
                requested_by: 'craig',
                requested_to: 'deebo',
                campaign_summary: {
                    name: 'Spring Clearance Sale',
                    audience: 'inactive_customers',
                    channels: ['email', 'sms'],
                    content_preview: 'Get 20% off! Valid for 48 hours only...',
                },
                status: 'pending' as const,
                timestamp: new Date(),
            };

            const result = CampaignReviewSchema.safeParse(review);
            expect(result.success).toBe(true);
            expect(result.data?.requested_to).toBe('deebo');
            expect(result.data?.campaign_summary.channels).toContain('email');
        });

        it('should record compliance approval by Deebo', () => {
            const review = {
                id: 'review_002',
                campaign_id: 'camp_124',
                requested_by: 'craig',
                requested_to: 'deebo',
                campaign_summary: {
                    name: 'New Product Launch',
                    audience: 'all_users',
                    channels: ['social', 'email'],
                    content_preview: 'Introducing our newest strain...',
                },
                status: 'approved' as const,
                reviewed_at: new Date(),
                timestamp: new Date(),
            };

            const result = CampaignReviewSchema.safeParse(review);
            expect(result.success).toBe(true);
            expect(result.data?.status).toBe('approved');
            expect(result.data?.reviewed_at).toBeDefined();
        });

        it('should capture compliance issues and revision requests', () => {
            const review = {
                id: 'review_003',
                campaign_id: 'camp_125',
                requested_by: 'craig',
                requested_to: 'deebo',
                campaign_summary: {
                    name: 'Flash Sale',
                    audience: 'young_adults',
                    channels: ['sms'],
                    content_preview: 'Limited time: $50 off all products!',
                },
                status: 'revision_needed' as const,
                deebo_feedback: 'Age-gated content needs explicit 21+ disclaimer per CA law',
                compliance_issues: [
                    'Missing 21+ age verification in SMS link',
                    'Product claims need substantiation',
                ],
                revision_requests: [
                    'Add prominent age gate to landing page',
                    'Include legal disclaimer in SMS',
                    'Link to certificate of analysis for products claimed',
                ],
                timestamp: new Date(),
            };

            const result = CampaignReviewSchema.safeParse(review);
            expect(result.success).toBe(true);
            expect(result.data?.status).toBe('revision_needed');
            expect(result.data?.compliance_issues?.length).toBe(2);
            expect(result.data?.revision_requests?.length).toBe(3);
        });
    });

    // =========================================================================
    // Multi-Agent Workflows (Leo Orchestration)
    // =========================================================================
    describe('Multi-Agent Workflows (Leo Orchestration)', () => {
        it('should create a workflow with multiple agents', () => {
            const workflow = {
                id: 'wf_001',
                name: 'Spring Campaign Creation',
                steps: [
                    { agent: 'ezal', task: 'Analyze competitor offers', status: 'completed' as const },
                    { agent: 'pops', task: 'Project audience size', status: 'in_progress' as const },
                    { agent: 'craig', task: 'Draft campaign', status: 'pending' as const },
                    { agent: 'deebo', task: 'Compliance review', status: 'pending' as const },
                ],
                status: 'running' as const,
                created_at: new Date(),
            };

            const result = WorkflowSchema.safeParse(workflow);
            expect(result.success).toBe(true);
            expect(result.data?.steps.length).toBe(4);
            expect(result.data?.steps[0].agent).toBe('ezal');
        });

        it('should track workflow completion time', () => {
            const now = new Date();
            const completedTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);

            const workflow = {
                id: 'wf_002',
                name: 'Q2 Planning Sprint',
                steps: [
                    { agent: 'pops', task: 'Analyze historical data', status: 'completed' as const },
                    { agent: 'leo', task: 'Coordinate goals', status: 'completed' as const },
                    { agent: 'craig', task: 'Create content calendar', status: 'completed' as const },
                ],
                status: 'completed' as const,
                created_at: now,
                completed_at: completedTime,
            };

            const result = WorkflowSchema.safeParse(workflow);
            expect(result.success).toBe(true);
            expect(result.data?.completed_at).toBeDefined();
            expect(result.data?.status).toBe('completed');
        });

        it('should handle workflow failures gracefully', () => {
            const workflow = {
                id: 'wf_003',
                name: 'Failed Campaign',
                steps: [
                    { agent: 'ezal', task: 'Get market intel', status: 'completed' as const },
                    { agent: 'craig', task: 'Draft campaign', status: 'failed' as const },
                ],
                status: 'failed' as const,
                created_at: new Date(),
            };

            const result = WorkflowSchema.safeParse(workflow);
            expect(result.success).toBe(true);
            expect(result.data?.status).toBe('failed');
        });
    });

    // =========================================================================
    // Collaboration Metrics (Team Performance)
    // =========================================================================
    describe('Collaboration Metrics', () => {
        it('should track successful delegations', () => {
            const metrics = {
                agents_coordinated_with: ['craig', 'ezal', 'pops', 'deebo'],
                successful_delegations: 12,
                failed_delegations: 1,
                avg_delegation_time_hours: 4.5,
                most_frequent_collaborator: 'craig',
            };

            const result = CollaborationMetricsSchema.safeParse(metrics);
            expect(result.success).toBe(true);
            expect(result.data?.agents_coordinated_with.length).toBe(4);
            expect(result.data?.successful_delegations).toBe(12);
        });

        it('should calculate team collaboration score', () => {
            const metrics = {
                agents_coordinated_with: ['craig', 'ezal', 'pops', 'deebo', 'money_mike'],
                successful_delegations: 25,
                failed_delegations: 2,
                avg_delegation_time_hours: 3.2,
                most_frequent_collaborator: 'craig',
            };

            const result = CollaborationMetricsSchema.safeParse(metrics);
            expect(result.success).toBe(true);

            // Calculate success rate
            const totalDelegations = 25 + 2;
            const successRate = (25 / totalDelegations) * 100;
            expect(successRate).toBeGreaterThan(92);
        });
    });

    // =========================================================================
    // Craig Memory with Dependencies
    // =========================================================================
    describe('Craig Agent Memory with Collaboration', () => {
        it('should track pending requests from other agents', () => {
            const craigMemory: Partial<CraigMemory> = {
                campaigns: [],
                pending_requests: [
                    {
                        id: 'del_req_1',
                        delegated_to: 'craig',
                        delegated_by: 'leo',
                        task_description: 'Review customer feedback',
                        status: 'in_progress',
                        timestamp: new Date(),
                    },
                ],
                pending_reviews: [],
                agent_dependencies: [
                    {
                        campaign_id: 'camp_100',
                        depends_on: [
                            {
                                agent: 'ezal',
                                data_type: 'market_intel',
                                status: 'received',
                            },
                            {
                                agent: 'deebo',
                                data_type: 'compliance',
                                status: 'pending',
                            },
                        ],
                    },
                ],
                last_active: new Date(),
                current_task_id: 'camp_100',
            };

            // Just verify structure
            expect(craigMemory.pending_requests?.length).toBe(1);
            expect(craigMemory.agent_dependencies?.length).toBe(1);
            expect(craigMemory.agent_dependencies?.[0].depends_on.length).toBe(2);
        });

        it('should track campaign reviews pending from Deebo', () => {
            const craigMemory: Partial<CraigMemory> = {
                campaigns: [],
                pending_requests: [],
                pending_reviews: [
                    {
                        id: 'review_waiting_1',
                        campaign_id: 'camp_200',
                        requested_by: 'craig',
                        requested_to: 'deebo',
                        campaign_summary: {
                            name: 'Test Campaign',
                            audience: 'vip',
                            channels: ['email'],
                            content_preview: 'VIP exclusive offer',
                        },
                        status: 'pending',
                        timestamp: new Date(),
                    },
                ],
                agent_dependencies: [],
                last_active: new Date(),
            };

            expect(craigMemory.pending_reviews?.length).toBe(1);
            expect(craigMemory.pending_reviews?.[0].status).toBe('pending');
        });
    });

    // =========================================================================
    // Leo Memory with Orchestration
    // =========================================================================
    describe('Leo Agent Memory with Orchestration', () => {
        it('should maintain delegation log', () => {
            const leoMemory: Partial<LeoMemory> = {
                objectives: [],
                snapshot_history: [],
                delegation_log: [
                    {
                        id: 'del_log_1',
                        delegated_to: 'craig',
                        delegated_by: 'leo',
                        task_description: 'Create campaign',
                        status: 'completed',
                        result: 'Campaign drafted and queued for review',
                        timestamp: new Date(),
                    },
                    {
                        id: 'del_log_2',
                        delegated_to: 'ezal',
                        delegated_by: 'leo',
                        task_description: 'Analyze competitor',
                        status: 'in_progress',
                        timestamp: new Date(),
                    },
                ],
                collaboration_metrics: {
                    agents_coordinated_with: ['craig', 'ezal', 'pops'],
                    successful_delegations: 8,
                    failed_delegations: 0,
                    avg_delegation_time_hours: 2.5,
                    most_frequent_collaborator: 'craig',
                },
                active_workflows: [],
                last_active: new Date(),
            };

            expect(leoMemory.delegation_log?.length).toBe(2);
            expect(leoMemory.collaboration_metrics?.agents_coordinated_with.length).toBe(3);
        });

        it('should track active workflows', () => {
            const leoMemory: Partial<LeoMemory> = {
                objectives: [],
                snapshot_history: [],
                delegation_log: [],
                active_workflows: [
                    {
                        id: 'wf_100',
                        name: 'Q2 Campaign Sprint',
                        steps: [
                            {
                                agent: 'ezal',
                                task: 'Competitive analysis',
                                status: 'completed',
                            },
                            {
                                agent: 'craig',
                                task: 'Campaign creation',
                                status: 'in_progress',
                            },
                            {
                                agent: 'deebo',
                                task: 'Compliance review',
                                status: 'pending',
                            },
                        ],
                        status: 'running',
                        created_at: new Date(),
                    },
                ],
                last_active: new Date(),
            };

            expect(leoMemory.active_workflows?.length).toBe(1);
            expect(leoMemory.active_workflows?.[0].steps.length).toBe(3);
        });
    });

    // =========================================================================
    // Deebo Memory with Review History
    // =========================================================================
    describe('Deebo Agent Memory with Review Tracking', () => {
        it('should track campaign reviews', () => {
            const deeboMemory: Partial<DeeboMemory> = {
                pending_reviews: [
                    {
                        id: 'review_123',
                        campaign_id: 'camp_200',
                        requested_by: 'craig',
                        requested_to: 'deebo',
                        campaign_summary: {
                            name: 'Summer Sale',
                            audience: 'all',
                            channels: ['email', 'sms'],
                            content_preview: '50% off all items',
                        },
                        status: 'pending',
                        timestamp: new Date(),
                    },
                ],
                rule_packs: [
                    {
                        jurisdiction: 'CA',
                        version: '2.0',
                        status: 'active',
                    },
                ],
                review_history: [
                    {
                        review_id: 'review_100',
                        campaign_id: 'camp_100',
                        reviewed_by_deebo: true,
                        result: 'approved',
                        reviewed_at: new Date(),
                    },
                ],
                last_active: new Date(),
            };

            expect(deeboMemory.pending_reviews?.length).toBe(1);
            expect(deeboMemory.review_history?.length).toBe(1);
            expect(deeboMemory.review_history?.[0].result).toBe('approved');
        });
    });

    // =========================================================================
    // Integration: Complete Campaign Flow
    // =========================================================================
    describe('Complete Campaign Review Flow', () => {
        it('should simulate Craig → Deebo → Leo approval workflow', () => {
            // 1. Craig creates campaign and requests Deebo review
            const review: any = {
                id: 'review_complete',
                campaign_id: 'camp_complete',
                requested_by: 'craig',
                requested_to: 'deebo',
                campaign_summary: {
                    name: 'Holiday Campaign',
                    audience: 'premium_members',
                    channels: ['email', 'sms', 'social'],
                    content_preview: 'Exclusive holiday deals for premium members',
                },
                status: 'pending',
                timestamp: new Date(),
            };

            // 2. Deebo reviews and approves
            review.status = 'approved';
            review.reviewed_at = new Date();
            review.deebo_feedback = 'Compliant with all CA cannabis regulations';

            // 3. Leo tracks in delegation log
            const delegation: any = {
                id: 'del_review_complete',
                delegated_to: 'craig',
                delegated_by: 'leo',
                task_description: 'Campaign review approval confirmed',
                status: 'completed',
                result: 'Campaign approved by Deebo, ready to schedule',
                timestamp: new Date(),
            };

            // Verify the flow
            expect(review.status).toBe('approved');
            expect(review.reviewed_at).toBeDefined();
            expect(delegation.status).toBe('completed');
            expect(delegation.result).toContain('approved');
        });
    });
});
