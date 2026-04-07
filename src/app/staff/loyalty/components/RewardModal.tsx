'use client';

import { useState, useEffect } from 'react';
import { Reward } from '@/types/club';
import { getAvailableRewards, redeemReward } from '@/server/actions/staff/loyalty';
import { X, Gift, Check, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface RewardModalProps {
    memberId: string;
    sessionId: string;
    memberName: string;
    onClose: () => void;
}

export function RewardModal({ memberId, sessionId, memberName, onClose }: RewardModalProps) {
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [loading, setLoading] = useState(true);
    const [redeemingId, setRedeemingId] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            const result = await getAvailableRewards(memberId);
            if (result.success && result.rewards) {
                setRewards(result.rewards);
            }
            setLoading(false);
        }
        load();
    }, [memberId]);

    const handleRedeem = async (rewardId: string) => {
        setRedeemingId(rewardId);
        const result = await redeemReward(rewardId, sessionId);
        if (result.success) {
            setRewards(prev => prev.filter(r => r.id !== rewardId));
            // Show success briefly before closing?
            setTimeout(onClose, 800);
        } else {
            setRedeemingId(null);
            alert("Redemption failed: " + result.error);
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
            <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100"
            >
                <div className="p-6 bg-emerald-600 text-white flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-black">{memberName}&apos;s Perks</h2>
                        <p className="text-emerald-100 font-medium">Select a reward to apply in the POS</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-emerald-700 rounded-full transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                            <Loader2 className="h-8 w-8 animate-spin mb-2" />
                            <p>Fetching active rewards...</p>
                        </div>
                    ) : rewards.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                <Sparkles className="h-8 w-8 text-gray-200" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">No Rewards Found</h3>
                            <p className="text-gray-500 max-w-[200px]">This member doesn&apos;t have any available rewards yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {rewards.map(reward => (
                                <button
                                    key={reward.id}
                                    onClick={() => handleRedeem(reward.id)}
                                    disabled={redeemingId !== null}
                                    className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${
                                        redeemingId === reward.id 
                                        ? "border-emerald-500 bg-emerald-50" 
                                        : "border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/30"
                                    }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex gap-3">
                                            <div className="h-10 w-10 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
                                                <Gift className="h-6 w-6 text-emerald-600" />
                                            </div>
                                            <div>
                                                <h4 className="font-black text-gray-900">{reward.title}</h4>
                                                <p className="text-sm text-gray-500">{reward.description}</p>
                                            </div>
                                        </div>
                                        {redeemingId === reward.id ? (
                                            <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                                        ) : (
                                            <div className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg uppercase tracking-wider">
                                                Available
                                            </div>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-6 bg-gray-50 flex gap-3">
                    <button 
                        onClick={onClose}
                        className="flex-1 py-4 bg-white border border-gray-200 rounded-2xl font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
