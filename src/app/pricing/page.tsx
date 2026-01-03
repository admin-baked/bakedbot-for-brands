import { PricingSection } from '@/components/landing/pricing-section';
import { Navbar } from '@/components/landing/navbar';
import { Footer } from '@/components/landing/footer';

export default function PricingPage() {
    return (
        <div className="min-h-screen flex flex-col pt-16">
            <Navbar />
            
            <main className="flex-1 bg-white">
                <div className="container mx-auto px-4 py-12 text-center">
                    <h1 className="text-4xl font-bold font-teko uppercase text-primary mb-4">
                        Hire Your Digital Workforce
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-12">
                        Start with a free Scout to audit your market, or deploy a full executive team to dominate it.
                    </p>
                </div>
                
                <PricingSection />
                
                {/* Enterprise Section */}
                <div className="bg-slate-900 text-white py-24 mt-12">
                     <div className="container mx-auto px-4 text-center">
                        <h2 className="text-3xl font-bold mb-6 font-teko uppercase tracking-wide">Ready for the $10M Path?</h2>
                        <p className="text-slate-400 max-w-2xl mx-auto mb-8">
                            For MSOs and brands processing over $5M/yr, our Agency Partner program provides custom infrastructure, dedicated strategy, and white-labeled agents.
                        </p>
                        <a href="mailto:sales@bakedbot.ai" className="inline-flex items-center justify-center h-12 px-8 rounded-md bg-white text-slate-900 font-medium hover:bg-slate-100 transition-colors">
                            Contact Enterprise Sales
                        </a>
                     </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
