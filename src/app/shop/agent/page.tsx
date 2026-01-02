import { Metadata } from 'next';
import { UnifiedAgentChat } from '@/components/chat/unified-agent-chat';
import { Bot, Sparkles } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Agentic Shopping | BakedBot',
    description: 'Your personal AI cannabis concierge.',
};

export default function AgentShoppingPage() {
    return (
        <main className="min-h-screen bg-slate-900 text-white flex flex-col">
            <header className="p-6 border-b border-slate-800">
                <div className="container mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-900/20">
                            <Bot className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="font-bold text-lg leading-tight">BakedBot Concierge</h1>
                            <p className="text-xs text-slate-400">Agentic Order Fulfillment</p>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex-1 container mx-auto p-4 md:p-8 flex flex-col items-center justify-center">
                <div className="w-full max-w-4xl space-y-6">
                    <div className="text-center space-y-2 mb-8">
                        <h2 className="text-3xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400">
                            "Order for me."
                        </h2>
                        <p className="text-lg text-slate-400 max-w-xl mx-auto">
                            I can browse every dispensary menu in your area, compare prices, and prepare your cart. Just tell me what you need.
                        </p>
                    </div>

                    <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-1 md:p-2 backdrop-blur shadow-2xl">
                        <UnifiedAgentChat 
                            role="concierge" // We might need to handle this role in backend or it falls back to 'assistant'
                            className="bg-slate-900/80 border-none h-[600px]"
                            promptSuggestions={[
                                "Find the cheapest 1g vape cartridge near me",
                                "I need a sleep aid that isn't gummy candy",
                                "Who has Blue Dream in stock right now?",
                                "Order an ounce of high-CBD flower for pickup"
                            ]}
                        />
                    </div>
                    
                    <div className="flex items-center justify-center gap-6 text-xs text-slate-500 uppercase tracking-widest">
                        <span className="flex items-center gap-2"><Sparkles className="w-3 h-3"/> Multi-Menu Search</span>
                        <span className="flex items-center gap-2"><Bot className="w-3 h-3"/> Autonomous Booking</span>
                    </div>
                </div>
            </div>
        </main>
    );
}
