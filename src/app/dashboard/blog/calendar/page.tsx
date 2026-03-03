/**
 * Content Calendar Dashboard Page
 *
 * Editorial calendar view with publishing cadence tracking
 * and content performance metrics.
 */

import { requireUser } from '@/server/auth/auth';
import { ContentCalendarClient } from './calendar-client';

export default async function ContentCalendarPage() {
    await requireUser(['super_user', 'brand_admin'] as any);

    return <ContentCalendarClient />;
}
