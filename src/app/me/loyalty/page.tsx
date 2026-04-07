'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { getAdminFirestore } from '@/firebase/admin';
import { Member, Membership, Pass, Reward } from '@/types/club';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    QrCode, 
    Smartphone, 
    Gift, 
    CircleUser, 
    ArrowLeft, 
    History, 
    Gem, 
    ChevronRight,
    Loader2,
    Barcode
} from 'lucide-react';

export default function MemberLoyaltyPage() {
    const searchParams = useSearchParams();
    const phone = searchParams.get('phone');
    
    const [loading, setLoading] = useState(true);
    const [member, setMember] = useState<Member | null>(null);
    const [membership, setMembership] = useState<Membership | null>(null);
    const [pass, setPass] = useState<Pass | null>(null);
    const [rewards, setRewards] = useState<Reward[]>([]);

    useEffect(() => {
        // In a real app, this would use the user session
        // For the pilot/demo, we allow looking up by phone
        async function loadData() {
            if (!phone) {
                setLoading(false);
                return;
            }

            try {
                // Fetch member by phone
                // (Using a server action is better, but doing a client-side POC for now)
                // Actually I should use a server action
                const response = await fetch(`/api/v1/loyalty/members/lookup?phone=${phone}`);
                const data = await response.json();
                
                if (data.success) {
                    setMember(data.member);
                    setMembership(data.membership);
                    setPass(data.pass);
                    setRewards(data.rewards);
                }
            } catch (err) {
                console.error("Failed to load loyalty profile", err);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [phone]);

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
                <Loader2 className="h-10 w-10 animate-spin text-emerald-500 mb-4" />
                <p className="font-medium tracking-widest uppercase text-xs opacity-50">Thrive Club</p>
            </div>
        );
    }

    if (!member) {
        return (
            <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center justify-center text-center">
                <div className="h-20 w-20 bg-gray-900 rounded-full flex items-center justify-center mb-6 border border-gray-800">
                    <CircleUser className="h-10 w-10 text-gray-700" />
                </div>
                <h1 className="text-3xl font-black mb-2">Join the Club</h1>
                <p className="text-gray-500 max-w-sm mb-8">Unlock exclusive drops, member-only pricing, and rewards in every bag.</p>
                <div className="w-full space-y-4">
                    <button className="w-full py-5 bg-white text-black font-black rounded-2xl">Create Account</button>
                    <button className="w-full py-5 bg-gray-900 text-white font-black rounded-2xl border border-gray-800">Sign In</button>
                </div>
            </div>
        );
    }

    const points = membership?.stats.lifetimePointsEarned || 0;

    return (
        <div className="min-h-screen bg-black text-white selection:bg-emerald-500 selection:text-black">
            {/* Header */}
            <div className="sticky top-0 z-10 px-6 py-8 flex justify-between items-center bg-black/80 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className="h-12 w-12 bg-gray-900 rounded-2xl flex items-center justify-center border border-gray-800">
                        <ArrowLeft className="h-6 w-6" />
                    </div>
                    <div>
                        <h2 className="font-black text-xl leading-none">Thrive Club</h2>
                        <p className="text-[10px] uppercase tracking-widest font-bold text-emerald-500 mt-1">Status: {member.status}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 rounded-full border border-gray-800 shadow-xl shadow-emerald-900/10">
                    <Gem className="h-4 w-4 text-emerald-400" />
                    <span className="font-black text-sm">{points}</span>
                </div>
            </div>

            <div className="px-6 pb-24 space-y-10">
                {/* Visual Pass Card */}
                <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="relative"
                >
                    <div className="absolute inset-0 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none" />
                    
                    <div className="relative aspect-[3/4.2] w-full rounded-[40px] bg-gradient-to-br from-gray-900 to-black border border-white/10 overflow-hidden shadow-2xl p-8 flex flex-col items-center text-center">
                        <div className="w-full flex justify-between items-start mb-12">
                            <span className="font-black text-xs uppercase tracking-tighter text-emerald-500">MEMBER PASS</span>
                            <QrCode className="h-5 w-5 text-gray-500" />
                        </div>

                        <div className="h-20 w-20 bg-gray-800 rounded-full flex items-center justify-center mb-6 overflow-hidden border-2 border-emerald-500/50">
                             <CircleUser className="h-full w-full text-gray-500" />
                        </div>

                        <h3 className="text-4xl font-black tracking-tight mb-2 uppercase">{member.firstName}</h3>
                        <p className="text-sm font-bold text-gray-500 mb-12">THRV_{member.phone.slice(-4).toUpperCase()}</p>

                        <div className="w-full aspect-square bg-white rounded-3xl p-6 flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.3)]">
                            {/* In real app, put the actual QR component here */}
                            <div className="w-full h-full border-4 border-black/5 flex items-center justify-center relative">
                                <QrCode className="h-full w-full text-black stroke-[1.5]" />
                                <div className="absolute inset-24 bg-white flex items-center justify-center rounded-xl scale-[0.6]">
                                    <div className="h-full w-full bg-emerald-500 rounded-lg" />
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-8 border-t border-white/5 w-full">
                           <div className="flex justify-center items-center gap-2 text-gray-400">
                               <Barcode className="h-10 w-48 stroke-[1]" />
                           </div>
                           <p className="text-[10px] font-bold text-gray-600 mt-2 tracking-[0.4em]">{pass?.barcodeValue}</p>
                        </div>
                    </div>
                </motion.div>

                {/* Rewards Grid */}
                <section>
                    <div className="flex justify-between items-end mb-6">
                        <h4 className="text-2xl font-black">Active Perks</h4>
                        <span className="text-xs font-bold text-emerald-500">VIEW ALL</span>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {rewards.length === 0 ? (
                            <div className="py-12 bg-gray-900/50 rounded-3xl border border-gray-800 text-center text-gray-500 flex flex-col items-center">
                                <Gift className="h-8 w-8 mb-3 opacity-20" />
                                <p className="font-bold text-sm">Every scan earns points</p>
                            </div>
                        ) : (
                            rewards.map((reward, i) => (
                                <motion.div 
                                    key={reward.id}
                                    initial={{ x: 20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="p-5 bg-gray-900 rounded-3xl border border-gray-800 flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="h-14 w-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                                            <Gift className="h-8 w-8" />
                                        </div>
                                        <div>
                                            <h5 className="font-black text-lg leading-tight">{reward.title}</h5>
                                            <p className="text-xs font-medium text-gray-500 mt-0.5">{reward.description}</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-gray-700" />
                                </motion.div>
                            ))
                        )}
                    </div>
                </section>

                <div className="grid grid-cols-2 gap-4">
                    <button className="flex flex-col items-center justify-center p-6 bg-gray-900 rounded-[2rem] border border-gray-800 hover:bg-gray-800 transition-colors group">
                        <History className="h-6 w-6 text-emerald-500 mb-2 group-hover:scale-110 transition-transform" />
                        <span className="font-black text-xs uppercase tracking-widest">History</span>
                    </button>
                    <button className="flex flex-col items-center justify-center p-6 bg-gray-900 rounded-[2rem] border border-gray-800 hover:bg-gray-800 transition-colors group">
                        <Smartphone className="h-6 w-6 text-emerald-500 mb-2 group-hover:scale-110 transition-transform" />
                        <span className="font-black text-xs uppercase tracking-widest">Wallet</span>
                    </button>
                </div>
            </div>

            {/* Bottom Nav Spacer */}
            <div className="h-env-bottom pb-8" />
        </div>
    );
}
