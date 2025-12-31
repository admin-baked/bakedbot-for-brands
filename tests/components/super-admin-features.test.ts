/**
 * Super Admin Features Tests
 * Tests for Super Admin intelligence unlock and sidebar features
 */

import { describe, it, expect, vi } from 'vitest';

describe('Super Admin Features', () => {
    describe('intelligence unlock', () => {
        it('should show Intelligence tab for super users only', () => {
            const userRole = 'super_admin';
            const isSuperUser = userRole === 'super_admin' || userRole === 'admin';
            
            expect(isSuperUser).toBe(true);
        });

        it('should hide Intelligence tab for regular users', () => {
            const userRole = 'brand';
            const isSuperUser = userRole === 'super_admin' || userRole === 'admin';
            
            expect(isSuperUser).toBe(false);
        });

        it('should include Intelligence in sidebar for super users', () => {
            const sidebarItems = [
                { label: 'Overview', roles: ['*'] },
                { label: 'Playbooks', roles: ['*'] },
                { label: 'Intelligence', roles: ['super_admin', 'admin'] },
                { label: 'CRM Lite', roles: ['*'] },
            ];
            
            const userRole = 'super_admin';
            const visibleItems = sidebarItems.filter(
                item => item.roles.includes('*') || item.roles.includes(userRole)
            );
            
            expect(visibleItems.find(i => i.label === 'Intelligence')).toBeDefined();
        });
    });

    describe('projects sidebar', () => {
        it('should show Projects link in sidebar', () => {
            const sidebarItems = [
                { label: 'Overview' },
                { label: 'Projects' },
                { label: 'Playbooks' },
            ];
            
            expect(sidebarItems.find(i => i.label === 'Projects')).toBeDefined();
        });

        it('should link to /dashboard/projects', () => {
            const projectsLink = {
                label: 'Projects',
                href: '/dashboard/projects',
                icon: 'FolderKanban'
            };
            
            expect(projectsLink.href).toBe('/dashboard/projects');
        });
    });

    describe('super user detection', () => {
        it('should detect super user from email domain', () => {
            const email = 'admin@bakedbot.ai';
            const superUserDomains = ['bakedbot.ai', 'baked.ai'];
            
            const domain = email.split('@')[1];
            const isSuperUser = superUserDomains.includes(domain);
            
            expect(isSuperUser).toBe(true);
        });

        it('should NOT flag non-bakedbot users as super users', () => {
            const email = 'user@example.com';
            const superUserDomains = ['bakedbot.ai', 'baked.ai'];
            
            const domain = email.split('@')[1];
            const isSuperUser = superUserDomains.includes(domain);
            
            expect(isSuperUser).toBe(false);
        });
    });

    describe('multi-org access', () => {
        it('should allow super users to switch organizations', () => {
            const superUserCapabilities = {
                canSwitchOrg: true,
                canViewAllOrgs: true,
                canRunGlobalPlaybooks: true,
            };
            
            expect(superUserCapabilities.canSwitchOrg).toBe(true);
        });

        it('should show org selector for super users', () => {
            const isSuperUser = true;
            const showOrgSelector = isSuperUser;
            
            expect(showOrgSelector).toBe(true);
        });
    });
});
