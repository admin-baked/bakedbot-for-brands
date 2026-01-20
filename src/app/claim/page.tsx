
import { ZipCodeSearch } from "@/components/claim/zip-code-search";
import { Navbar } from "@/components/landing/navbar";
import { LandingFooter } from "@/components/landing/footer";
import { Badge } from "@/components/ui/badge";
import { Globe, Search, ArrowUpRight } from "lucide-react";

export const metadata = {
  title: "Claim Your ZIP Code | BakedBot Discovery Layer",
  description: "Secure your local territory. Get exclusive traffic from thousands of SEO-generated 'dispensary near me' pages.",
};

export default function ClaimPage() {
  return (
    <div className="min-h-screen flex flex-col pt-16 bg-white">
      <Navbar />

      <main className="flex-1 flex flex-col">
        <section className="flex-1 flex flex-col justify-center items-center py-20 px-4 relative overflow-hidden bg-slate-50">
           {/* Background Mesh */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl opacity-50" />
            </div>

           <div className="relative z-10 w-full max-w-3xl text-center">
            <Badge variant="outline" className="mb-8 px-4 py-1.5 text-sm bg-white border-primary/20 text-primary shadow-sm">
                LIMITED AVAILABILITY • PILOT PHASE
            </Badge>
            
            <h1 className="text-5xl md:text-7xl font-bold font-teko uppercase tracking-tight mb-8 leading-none">
              Do you own <br /> <span className="text-primary">your territory?</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-12 text-balance leading-relaxed">
              We generate thousands of local SEO pages for every ZIP code. <br className="hidden md:inline" />
              Claim yours to capture 100% of the traffic.
            </p>

            <ZipCodeSearch className="mb-16" autoFocus />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left mt-8 max-w-4xl mx-auto opacity-80">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-white border shadow-sm flex items-center justify-center shrink-0">
                        <Globe className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-900">1. We Build It</h4>
                        <p className="text-sm text-slate-500">We launch 50+ SEO pages targeting keywords in your ZIP.</p>
                    </div>
                </div>
                 <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-white border shadow-sm flex items-center justify-center shrink-0">
                        <Search className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-900">2. It Ranks</h4>
                        <p className="text-sm text-slate-500">Pages rank for "dispensary near [landmark]" and other creative terms.</p>
                    </div>
                </div>
                 <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-white border shadow-sm flex items-center justify-center shrink-0">
                        <ArrowUpRight className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-900">3. You Profit</h4>
                        <p className="text-sm text-slate-500">Traffic is funneled exclusively to your menu. No competitors.</p>
                    </div>
                </div>
            </div>
          </div>
        </section>
      </main>
    
      <LandingFooter />
    </div>
  );
}
