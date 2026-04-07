'use client';

import { useState, useEffect } from 'react';
import { getActiveVisitSessions, attachSessionToCart } from '@/server/actions/staff/loyalty';
import { VisitSession } from '@/types/club';
import { RewardModal } from './components/RewardModal';
import { AnimatePresence } from 'framer-motion';
import { 
    Users, 
    ArrowRight, 
    Clock, 
    ShoppingCart, 
    Search,
    Loader2,
    RefreshCw,
    Gift,
    ChevronRight
} from 'lucide-react';

export default function StaffLoyaltyQueuePage() {
    const [orgId] = useState('org_thrive_syracuse'); // In prod, get from context/auth
    const [sessions, setSessions] = useState<(VisitSession & { memberName: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [selectedSessionForRewards, setSelectedSessionForRewards] = useState<{ memberId: string; sessionId: string; memberName: string } | null>(null);

    const fetchSessions = async () => {
        setLoading(true);
        const res = await getActiveVisitSessions(orgId);
        if (res.success && res.sessions) {
            setSessions(res.sessions);
        } else {
            setError(res.error || 'Failed to fetch queue');
        }
        setLoading(false);
        setLastUpdated(new Date());
    };

    useEffect(() => {
        void fetchSessions();
        const interval = setInterval(fetchSessions, 15_000); // 15s live refresh
        return () => clearInterval(interval);
    }, [orgId]);

    const handleAttach = async (sessionId: string) => {
        const cartRef = window.prompt("Enter POS Cart/Order Reference:");
        if (!cartRef) return;
        
        const res = await attachSessionToCart(sessionId, cartRef);
        if (res.success) {
            void fetchSessions();
        } else {
            alert(`Error: ${res.error}`);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6 font-sans">
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Loyalty Queue</h1>
                    <p className="text-sm text-gray-500 font-medium">Live check-ins from Tablet & Customer App</p>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-xs font-mono text-gray-400">Last update: {lastUpdated.toLocaleTimeString()}</span>
                    <button 
                        onClick={() => void fetchSessions()}
                        className="p-2 bg-white rounded-full border shadow-sm hover:bg-gray-50"
                    >
                        <RefreshCw className={`h-4 w-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <div className="bg-amber-100 text-amber-800 px-4 py-2 rounded-xl font-bold text-sm border border-amber-200">
                        {sessions.length} Active
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Search Bar (Placeholder) */}
                <div className="lg:col-span-12">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Find member by name or phone..."
                            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-200 transition-all text-gray-900"
                        />
                    </div>
                </div>

                {/* Queue List */}
                <div className="lg:col-span-12">
                    {loading && sessions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed text-gray-400 gap-4">
                            <Loader2 className="h-10 w-10 animate-spin" />
                            <p className="font-bold">Loading live sessions...</p>
                        </div>
                    ) : sessions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed text-gray-400 gap-4">
                            <Users className="h-12 w-12 opacity-30" />
                            <p className="font-bold">Queue is empty. Waiting for check-ins.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {sessions.map((session) => (
                                <div 
                                    key={session.id}
                                    className="bg-white rounded-3xl border-2 p-5 flex items-center justify-between transition-all hover:border-amber-400 group"
                                    style={{ 
                                        borderColor: session.status === 'attached_to_cart' ? '#d1fae5' : '#f3f4f6',
                                        backgroundColor: session.status === 'attached_to_cart' ? '#f0fdf4' : 'white'
                                    }}
                                >
                                    <div className="flex items-center gap-6">
                                        <div className="h-14 w-14 rounded-2xl bg-gray-100 flex items-center justify-center text-2xl font-black text-gray-400 border shadow-sm">
                                            {session.status === 'attached_to_cart' ? <ShoppingCart className="h-8 w-8 text-emerald-600" /> : <Users className="h-8 w-8" />}
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-gray-900 leading-tight">{session.memberName}</h3>
                                            <p className="text-sm font-medium text-gray-400 flex items-center gap-2 mt-1">
                                                <Clock className="h-3 w-3" /> Started {new Date(session.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'})} via <span className="capitalize text-amber-600">{session.source.replace('_', ' ')}</span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {session.status === 'opened' && (
                                            <button 
                                                onClick={() => handleAttach(session.id)}
                                                className="bg-gray-900 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-black transition-all active:scale-95 shadow-xl"
                                            >
                                                Recognize & Attach <ArrowRight className="h-5 w-5" />
                                            </button>
                                        )}
                                        {session.status === 'attached_to_cart' && (
                                            <div className="flex items-center gap-3">
                                                <div className="px-5 py-3 bg-emerald-100 text-emerald-800 rounded-2xl font-black border border-emerald-200">
                                                    Cart: {session.posCartRef}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button 
                                                        onClick={() => setSelectedSessionForRewards({ memberId: session.memberId, sessionId: session.id, memberName: session.memberName })}
                                                        className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl font-black text-sm hover:bg-emerald-100 transition-colors flex items-center gap-2"
                                                    >
                                                        <Gift className="h-4 w-4" />
                                                        Perks
                                                    </button>
                                                    <button className="p-3 bg-gray-100 text-gray-500 rounded-2xl hover:bg-gray-200 transition-colors">
                                                        <ChevronRight className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    <AnimatePresence>
                        {selectedSessionForRewards && (
                            <RewardModal 
                                memberId={selectedSessionForRewards.memberId}
                                sessionId={selectedSessionForRewards.sessionId}
                                memberName={selectedSessionForRewards.memberName}
                                onClose={() => setSelectedSessionForRewards(null)}
                            />
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
