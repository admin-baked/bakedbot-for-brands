/**
 * Brand Pages Management Dashboard
 *
 * Edit About, Careers, Locations, Contact, Loyalty, and Press pages
 */

import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth-helpers';
import { getAllBrandPages } from '@/server/actions/brand-pages';
import { BrandPagesClient } from './page-client';

export default async function BrandPagesPage() {
    const user = await requireUser(['brand', 'dispensary', 'super_user']);

    // Get orgId from user
    const orgId = (user as any).orgId || (user as any).brandId || user.uid;

    if (!orgId) {
        redirect('/dashboard');
    }

    // Fetch all brand pages
    const pages = await getAllBrandPages(orgId);

    return <BrandPagesClient orgId={orgId} initialPages={pages} />;
}
