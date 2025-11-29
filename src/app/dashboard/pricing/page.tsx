
'use client';

import { useState, useEffect, useCallback } from 'react';
import { getAuth } from 'firebase/auth';
import { PricingRecommendation } from '@/types/pricing';

import { logger } from '@/lib/logger';
export default function PricingPage() {
    const [recommendations, setRecommendations] = useState<PricingRecommendation[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const auth = getAuth();

    const fetchRecommendations = useCallback(async () => {
        try {
            setLoading(true);
            const user = auth.currentUser;
            if (!user) {
                // Wait for auth or handle redirect
                return;
            }
            const token = await user.getIdToken();

            // Hardcoded brandId for now, similar to menu sync
            const brandId = 'DEMO_BRAND_ID';

            const response = await fetch(`/api/pricing/recommendations?brandId=${brandId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch recommendations');

            const data = await response.json();
            setRecommendations(data.data || []);
        } catch (err) {
            logger.error('Error fetching recommendations:', err);
            // Don't show error immediately on load if it's just auth delay
        } finally {
            setLoading(false);
        }
    }, [auth]);

    useEffect(() => {
        fetchRecommendations();
    }, [fetchRecommendations]);

    const handleGenerate = async () => {
        try {
            setGenerating(true);
            setError(null);

            const user = auth.currentUser;
            if (!user) {
                setError('You must be logged in');
                return;
            }

            const token = await user.getIdToken();
            const brandId = 'DEMO_BRAND_ID';

            const response = await fetch('/api/pricing/recommendations', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ brandId })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Generation failed');
            }

            const result = await response.json();
            setRecommendations(result.data || []);

        } catch (err: any) {
            logger.error('Generation error:', err);
            setError(err.message);
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Pricing Intelligence</h1>
                    <p className="text-gray-500 mt-1">AI-powered pricing insights and recommendations</p>
                </div>
                <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className={`px-4 py-2 rounded-lg font-medium text-white transition-colors ${generating
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-indigo-600 hover:bg-indigo-700'
                        }`}
                >
                    {generating ? 'Analyzing Market...' : 'Generate Insights'}
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                    {error}
                </div>
            )}

            <div className="grid gap-6">
                {loading ? (
                    <div className="text-center py-12 text-gray-500">Loading insights...</div>
                ) : recommendations.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                        <div className="text-gray-400 text-5xl mb-4">💡</div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Recommendations</h3>
                        <p className="text-gray-500 max-w-md mx-auto mb-6">
                            Our AI hasn't found any significant pricing anomalies yet. Try generating new insights to scan the latest market data.
                        </p>
                        <button
                            onClick={handleGenerate}
                            className="text-indigo-600 font-medium hover:text-indigo-800"
                        >
                            Run Analysis Now &rarr;
                        </button>
                    </div>
                ) : (
                    recommendations.map((rec) => (
                        <div key={rec.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col md:flex-row">
                            <div className="p-6 flex-1">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">{rec.productName}</h3>
                                        <p className="text-sm text-gray-500">Product ID: {rec.productId}</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${rec.recommendedPrice > rec.currentPrice
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-blue-100 text-blue-800'
                                        }`}>
                                        {rec.recommendedPrice > rec.currentPrice ? 'Opportunity to Raise' : 'Consider Lowering'}
                                    </span>
                                </div>

                                <p className="text-gray-700 mb-6">{rec.reason}</p>

                                <div className="grid grid-cols-3 gap-4 bg-gray-50 rounded-lg p-4 text-sm">
                                    <div>
                                        <p className="text-gray-500 mb-1">Current Price</p>
                                        <p className="font-semibold text-gray-900">${rec.currentPrice.toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500 mb-1">Market Average</p>
                                        <p className="font-semibold text-gray-900">${rec.marketAverage.toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500 mb-1">Recommended</p>
                                        <p className="font-semibold text-indigo-600">${rec.recommendedPrice.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50 px-6 py-4 md:w-48 flex flex-col justify-center border-t md:border-t-0 md:border-l border-gray-200 space-y-3">
                                <button className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors">
                                    Apply Price
                                </button>
                                <button className="w-full py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition-colors">
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
