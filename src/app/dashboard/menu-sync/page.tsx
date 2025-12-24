
'use client';

import { useState, useEffect, useCallback } from 'react';
import { initializeFirebase } from '@/firebase';
import { getAuth } from 'firebase/auth';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { RetailerDoc } from '@/types/cannmenus';

import { logger } from '@/lib/logger';
export default function MenuSyncPage() {
    const [retailers, setRetailers] = useState<RetailerDoc[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastSync, setLastSync] = useState<string | null>(null);

    const { firestore } = initializeFirebase();
    const auth = getAuth();

    const fetchRetailers = useCallback(async () => {
        try {
            setLoading(true);
            const retailersRef = collection(firestore, 'retailers');
            const q = query(retailersRef, orderBy('name'));
            const snapshot = await getDocs(q);

            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as RetailerDoc[];

            setRetailers(data);
        } catch (err) {
            logger.error('Error fetching retailers:', err instanceof Error ? err : new Error(String(err)));
            setError('Failed to load retailers');
        } finally {
            setLoading(false);
        }
    }, [firestore]);

    useEffect(() => {
        fetchRetailers();
    }, [fetchRetailers]);

    const handleSync = async () => {
        try {
            setSyncing(true);
            setError(null);

            const user = auth.currentUser;
            if (!user) {
                setError('You must be logged in to sync menus');
                return;
            }

            const token = await user.getIdToken();
            const brandId = 'DEMO_BRAND_ID';

            const response = await fetch('/api/cannmenus/sync', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ brandId })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Sync failed');
            }

            setLastSync(new Date().toISOString());
            await fetchRetailers(); // Refresh list

        } catch (err: any) {
            logger.error('Sync error:', err);
            setError(err.message);
        } finally {
            setSyncing(false);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Menu Synchronization</h1>
                    <p className="text-gray-500 mt-1">Manage automated menu syncing with CannMenus</p>
                </div>
                <button
                    onClick={handleSync}
                    disabled={syncing}
                    className={`px-4 py-2 rounded-lg font-medium text-white transition-colors ${syncing
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700'
                        }`}
                >
                    {syncing ? 'Syncing...' : 'Sync Now'}
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                    {error}
                </div>
            )}

            {lastSync && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6" suppressHydrationWarning>
                    Sync completed successfully at {new Date(lastSync).toLocaleTimeString()}
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h2 className="font-semibold text-gray-700">Synced Retailers</h2>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading retailers...</div>
                ) : retailers.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        No retailers found. Click "Sync Now" to fetch data.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                                    <th className="px-6 py-3 font-semibold">Retailer Name</th>
                                    <th className="px-6 py-3 font-semibold">Location</th>
                                    <th className="px-6 py-3 font-semibold">Status</th>
                                    <th className="px-6 py-3 font-semibold">Last Updated</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {retailers.map((retailer) => (
                                    <tr key={retailer.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {retailer.name}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {retailer.city}, {retailer.state}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${retailer.menu_discovery_status === 'found'
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {retailer.menu_discovery_status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 text-sm" suppressHydrationWarning>
                                            {retailer.updatedAt?.toDate
                                                ? retailer.updatedAt.toDate().toLocaleDateString()
                                                : 'N/A'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
