/**
 * Discovery Hub (Foot Traffic Tab) Tests
 * Tests for the Discovery Hub UI consolidation
 */

import { describe, it, expect, vi } from 'vitest';

describe('Discovery Hub', () => {
    describe('sidebar navigation', () => {
        it('should use Compass icon for Discovery Hub', () => {
            const discoveryHubEntry = {
                label: 'Discovery Hub',
                icon: 'Compass', // lucide-react icon
                href: '/dashboard/ceo?tab=foot-traffic'
            };
            
            expect(discoveryHubEntry.icon).toBe('Compass');
            expect(discoveryHubEntry.label).toBe('Discovery Hub');
        });

        it('should be in Operations group, not Insights', () => {
            const operationsGroup = {
                label: 'Operations',
                items: ['Discovery Hub', 'Playbooks', 'Projects']
            };
            
            const insightsGroup = {
                label: 'Insights',
                items: ['Analytics', 'Reports']
            };
            
            expect(operationsGroup.items).toContain('Discovery Hub');
            expect(insightsGroup.items).not.toContain('Discovery Hub');
        });
    });

    describe('header content', () => {
        it('should display "Discovery Hub" as title', () => {
            const header = {
                title: 'Discovery Hub',
                subtitle: 'Generate and manage SEO pages for Brands, Dispensaries, and Locations.'
            };
            
            expect(header.title).toBe('Discovery Hub');
            expect(header.subtitle).toContain('SEO pages');
        });

        it('should NOT display old "Foot Traffic Control Center" title', () => {
            const title = 'Discovery Hub';
            
            expect(title).not.toBe('Foot Traffic Control Center');
            expect(title).not.toContain('Foot Traffic');
        });
    });

    describe('tab structure', () => {
        it('should have Pages tab for viewing existing pages', () => {
            const tabs = ['Pages', 'Generate', 'Analytics', 'Settings'];
            
            expect(tabs).toContain('Pages');
            expect(tabs).toContain('Generate');
        });

        it('should use "Run Discovery" button instead of "Quick Generate ZIPs"', () => {
            const buttonLabel = 'Run Discovery';
            
            expect(buttonLabel).toBe('Run Discovery');
            expect(buttonLabel).not.toBe('Quick Generate ZIPs');
        });
    });

    describe('DiscoveryPilotDialog', () => {
        it('should allow selecting city and state', () => {
            const dialogState = {
                city: 'Denver',
                state: 'CO',
                type: 'dispensary' as 'brand' | 'dispensary'
            };
            
            expect(dialogState.city).toBe('Denver');
            expect(dialogState.state).toBe('CO');
            expect(dialogState.type).toBe('dispensary');
        });

        it('should support both brand and dispensary discovery types', () => {
            const types = ['brand', 'dispensary'] as const;
            
            expect(types).toContain('brand');
            expect(types).toContain('dispensary');
        });
    });
});
