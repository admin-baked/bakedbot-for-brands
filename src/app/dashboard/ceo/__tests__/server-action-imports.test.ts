import fs from 'fs';
import path from 'path';

describe('CEO dashboard server action import boundaries', () => {
  it('lazy-loads page-level server actions instead of eagerly importing them', () => {
    const pagePath = path.join(process.cwd(), 'src/app/dashboard/ceo/page.tsx');
    const source = fs.readFileSync(pagePath, 'utf8');

    expect(source).not.toContain("import { getChatSessions } from '@/server/actions/chat-persistence'");
    expect(source).not.toContain("import { getSuperUserStatusCounts, type SuperUserStatusCounts } from '@/server/actions/ny-outreach-dashboard'");
    expect(source).toContain("import('@/server/actions/chat-persistence')");
    expect(source).toContain("import('@/server/actions/ny-outreach-dashboard')");
  });

  it('lazy-loads outreach tab server actions instead of eagerly importing the action module', () => {
    const tabPath = path.join(process.cwd(), 'src/app/dashboard/ceo/components/outreach-tab.tsx');
    const source = fs.readFileSync(tabPath, 'utf8');

    expect(source).not.toContain("import {\n    getOutreachDashboardData,");
    expect(source).toContain("import type { ApolloCreditStatus } from '@/server/actions/ny-outreach-dashboard';");
    expect(source).toContain("type OutreachDashboardActions = typeof import('@/server/actions/ny-outreach-dashboard');");
    expect(source).toContain("return import('@/server/actions/ny-outreach-dashboard');");
  });
});
