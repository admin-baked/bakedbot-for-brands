/**
 * Content Calendar Dashboard Page
 *
 * Editorial calendar view with publishing cadence tracking
 * and content performance metrics.
 */

import { requireUser } from '@/lib/auth-helpers';
import { redirect } from 'next/navigation';
import { ContentCalendarClient } from './calendar-client';

export default async function ContentCalendarPage() {
    const user = await requireUser(['super_user', 'brand_admin']);

    if (!user || (user.role !== 'super_user' && user.role !== 'brand_admin')) {
        redirect('/dashboard');
    }

    return <ContentCalendarClient />;
}
