
import { getZipCodeCoordinates, getRetailersByZipCode, discoverNearbyProducts } from '@/server/services/geo-discovery';
import { CANNMENUS_CONFIG } from '@/lib/config';

export const dynamic = 'force-dynamic';

export default async function DebugDiscoveryPage({
    searchParams,
}: {
    searchParams: { zip?: string };
}) {
    const zipCode = searchParams.zip || '90002';

    // 1. Check Config
    const configStatus = {
        apiKeyPresent: !!CANNMENUS_CONFIG.API_KEY,
        apiKeyLength: CANNMENUS_CONFIG.API_KEY?.length || 0,
        apiBase: CANNMENUS_CONFIG.API_BASE
    };

    // 2. Check Geocoding
    const coords = await getZipCodeCoordinates(zipCode);

    // 3. Check Retailers
    let retailers: any[] = [];
    try {
        retailers = await getRetailersByZipCode(zipCode, 5);
    } catch (e: any) {
        retailers = [{ error: e.message }];
    }

    // 4. Check Discovery
    let discovery: any = null;
    if (coords) {
        try {
            discovery = await discoverNearbyProducts({
                lat: coords.lat,
                lng: coords.lng,
                radiusMiles: 15,
                limit: 5,
                cityName: coords.city,
                state: coords.state
            });
        } catch (e: any) {
            discovery = { error: e.message };
        }
    }

    return (
        <div className="p-8 font-mono text-sm">
            <h1 className="text-2xl font-bold mb-4">Discovery Debugger: {zipCode}</h1>

            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-2">Configuration</h2>
                <pre className="bg-slate-100 p-4 rounded">{JSON.stringify(configStatus, null, 2)}</pre>
            </section>

            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-2">Geocoding (Cache/Live)</h2>
                <pre className="bg-slate-100 p-4 rounded">{JSON.stringify(coords, null, 2)}</pre>
            </section>

            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-2">Retailers Found ({retailers.length})</h2>
                <pre className="bg-slate-100 p-4 rounded">{JSON.stringify(retailers, null, 2)}</pre>
            </section>

            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-2">Discovery Results</h2>
                <pre className="bg-slate-100 p-4 rounded">{JSON.stringify(discovery, null, 2)}</pre>
            </section>
        </div>
    );
}
