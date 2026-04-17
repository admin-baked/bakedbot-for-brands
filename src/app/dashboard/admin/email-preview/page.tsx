/**
 * Email Preview Dashboard
 *
 * Preview all transactional email templates without sending.
 * Shows per-org performance stats (sent 7d, open rate, click rate).
 */

import { getEmailInsights } from '@/server/actions/email-insights';
import { EmailPreviewClient } from './email-preview-client';

export const dynamic = 'force-dynamic';

export default async function EmailPreviewPage() {
    let insights = [];
    try {
        insights = await getEmailInsights();
    } catch {
        // non-critical — page still renders with empty stats
    }

    return <EmailPreviewClient insights={insights} />;
}
