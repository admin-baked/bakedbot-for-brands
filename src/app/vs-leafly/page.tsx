import Link from "next/link";
import { Check, X, ArrowRight, Globe, Lock, Coins, Search } from "lucide-react";
import { Navbar } from "@/components/landing/navbar";
import { LandingFooter } from "@/components/landing/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "BakedBot vs Leafly | Stop Renting Your Customers",
  description: "Leafly and Weedmaps own your traffic. BakedBot's discovery pages capture SEO demand and funnel it directly to YOUR menu. Take back control.",
};

export default function VsLeaflyPage() {
  return (
    <div className="min-h-screen flex flex-col pt-16 bg-white">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 px-4 md:py-32 bg-slate-50">
           <div className="container mx-auto max-w-6xl relative z-10 text-center">
            <Badge variant="outline" className="mb-6 px-4 py-1 text-sm bg-white border-primary/20 text-primary">
              BakedBot vs. Marketplaces (Leafly/Weedmaps)
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold font-teko uppercase tracking-tight mb-6">
              Stop <span className="text-red-600">renting</span> your customers.
            </h1>
             <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-10 text-balance">
              Marketplaces charge you to list your menu, then sell your traffic to the highest bidder.
              <br className="hidden md:block" />
              <strong>BakedBot gives you the traffic back.</strong>
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="h-12 px-8 text-base" asChild>
                <Link href="/get-started">Claim Your Traffic</Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 text-base" asChild>
                <Link href="/claim">Check Your ZIP Code</Link>
              </Button>
            </div>
             <p className="mt-4 text-sm text-muted-foreground">
              See who's ranking in your local area.
            </p>
          </div>
        </section>

        {/* The Direct Comparison */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-5xl">
            <div className="grid md:grid-cols-2 gap-8">
              
              {/* The Marketplace Model */}
              <Card className="border-red-100 bg-red-50/30">
                <CardHeader className="text-center border-b border-red-100 pb-6">
                  <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600">
                    <Lock className="w-6 h-6" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-slate-800">The "Rental" Model</CardTitle>
                  <p className="text-slate-500">Leafly, Weedmaps, Jane</p>
                </CardHeader>
                <CardContent className="pt-8 space-y-4">
                  <div className="flex gap-3">
                    <X className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-slate-700"><strong>They SEO their site</strong>, not yours.</p>
                  </div>
                  <div className="flex gap-3">
                    <X className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-slate-700">Competitors appear <strong>on your menu page</strong>.</p>
                  </div>
                  <div className="flex gap-3">
                    <X className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-slate-700">You pay monthly fees + "boost" costs.</p>
                  </div>
                  <div className="flex gap-3">
                    <X className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-slate-700">If you leave, <strong>you lose the traffic</strong>.</p>
                  </div>
                </CardContent>
              </Card>

              {/* The BakedBot Model */}
              <Card className="border-primary/20 bg-primary/5 shadow-lg relative overflow-hidden">
                 <div className="absolute top-0 right-0 bg-primary text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                  RECOMMENDED
                </div>
                <CardHeader className="text-center border-b border-primary/10 pb-6">
                  <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary">
                    <Globe className="w-6 h-6" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-primary">The "Owned" Model</CardTitle>
                  <p className="text-primary/70">BakedBot Discovery Layer</p>
                </CardHeader>
                <CardContent className="pt-8 space-y-4">
                   <div className="flex gap-3">
                    <Check className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                    <p className="text-slate-800"><strong>We SEO YOUR pages.</strong> You rank on Google.</p>
                  </div>
                   <div className="flex gap-3">
                    <Check className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                    <p className="text-slate-800"><strong>Zero competitor ads</strong> on your profile.</p>
                  </div>
                   <div className="flex gap-3">
                    <Check className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                    <p className="text-slate-800">Flat monthly fee. No "pay to play."</p>
                  </div>
                   <div className="flex gap-3">
                    <Check className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                    <p className="text-slate-800">Conversion happens <strong>on your domain</strong>.</p>
                  </div>
                </CardContent>
              </Card>

            </div>
          </div>
        </section>

         {/* Feature Deep Dive */}
         <section className="py-20 bg-slate-900 text-white">
          <div className="container mx-auto max-w-6xl px-4">
            <h2 className="text-3xl md:text-4xl font-bold font-teko uppercase text-center mb-16">
              How We Help You Win The Territory War
            </h2>

            <div className="grid md:grid-cols-3 gap-8">
              <Card className="bg-slate-800 border-slate-700 text-slate-100">
                <CardHeader>
                  <Search className="w-10 h-10 text-emerald-400 mb-4" />
                  <CardTitle>ZIP Code Monopoly</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-300">
                    Claim "dispensary near [ZIP]" pages. We auto-generate SEO content that captures local intent and funnels it to your menu.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700 text-slate-100">
                <CardHeader>
                  <Coins className="w-10 h-10 text-yellow-400 mb-4" />
                   <CardTitle>Zero "Tax" on Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-300">
                    Marketplaces take a cut or charge per order. BakedBot is a flat subscription. Whether you sell $10k or $100k, the price is $99.
                  </p>
                </CardContent>
              </Card>

               <Card className="bg-slate-800 border-slate-700 text-slate-100">
                <CardHeader>
                  <Lock className="w-10 h-10 text-blue-400 mb-4" />
                   <CardTitle>Your Data. Your Customers.</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-300">
                    Build YOUR email/SMS list, not theirs. We integrate direct to your CRM so you own the lifecycle of every shopper.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-4 text-center">
          <div className="container mx-auto max-w-3xl">
            <h2 className="text-4xl md:text-5xl font-bold font-teko uppercase mb-6 text-slate-900">
              Take Back Your Traffic.
            </h2>
            <p className="text-xl text-muted-foreground mb-10">
              Start claiming your local ZIP codes today before a competitor does.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
               <Button size="lg" className="h-14 px-8 text-lg w-full sm:w-auto bg-primary text-primary-foreground" asChild>
                <Link href="/claim">Search My ZIP Code</Link>
              </Button>
               <Button size="lg" variant="outline" className="h-14 px-8 text-lg w-full sm:w-auto" asChild>
                <Link href="/pricing">View Plans</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
