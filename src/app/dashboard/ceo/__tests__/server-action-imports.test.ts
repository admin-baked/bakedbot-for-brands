import fs from 'fs';
import path from 'path';

describe('CEO dashboard server action import boundaries', () => {
  it('lazy-loads page-level server actions instead of eagerly importing them', () => {
    const pagePath = path.join(process.cwd(), 'src/app/dashboard/ceo/page.tsx');
    const source = fs.readFileSync(pagePath, 'utf8');

    expect(source).not.toContain("import { getChatSessions } from '@/server/actions/chat-persistence'");
    expect(source).toContain("import('@/server/actions/chat-persistence')");
    // ny-outreach-dashboard is no longer directly imported/lazy-loaded in the CEO page;
    // SuperUserStatusCounts is now consumed inside MissionControlTab
    expect(source).toContain("// SuperUserStatusCounts now consumed inside MissionControlTab");
  });

  it('hydrates chat sessions only on chat-enabled CEO tabs', () => {
    const pagePath = path.join(process.cwd(), 'src/app/dashboard/ceo/page.tsx');
    const source = fs.readFileSync(pagePath, 'utf8');

    expect(source).toContain("const CHAT_HYDRATION_TABS = new Set(['agents', 'boardroom', 'playbooks', 'dev-console']);");
    expect(source).toContain("if (!CHAT_HYDRATION_TABS.has(currentTab)) {");
  });

  it('lazy-loads outreach tab server actions instead of eagerly importing the action module', () => {
    const tabPath = path.join(process.cwd(), 'src/app/dashboard/ceo/components/outreach-tab.tsx');
    const source = fs.readFileSync(tabPath, 'utf8');

    expect(source).not.toContain("import {\n    getOutreachDashboardData,");
    expect(source).toContain("import type { ApolloCreditStatus } from '@/server/services/ny-outreach/apollo-enrichment';");
    expect(source).toContain("type OutreachDashboardActions = typeof import('@/server/actions/ny-outreach-dashboard');");
    expect(source).toContain("return import('@/server/actions/ny-outreach-dashboard');");
  });
});
