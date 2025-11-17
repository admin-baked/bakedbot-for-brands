
import PageClient from './page-client';

export const dynamic = 'force-dynamic';

export default function ProductContentGeneratorPage() {
    // This is now a pure server component that just renders the client wrapper.
    return <PageClient />;
}
