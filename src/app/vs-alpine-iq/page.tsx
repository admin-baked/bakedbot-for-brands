import Link from "next/link";
import { Check, X, ArrowRight, ShieldCheck, Zap, BarChart3, Bot } from "lucide-react";
import { Navbar } from "@/components/landing/navbar";
import { LandingFooter } from "@/components/landing/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";

export const metadata = {
  title: "BakedBot vs Alpine IQ | 5x the Value at the Same Price",
  description: "Compare BakedBot against Alpine IQ. Get the same CRM power plus AI agents, SEO menus, and competitive intel for just $99/mo.",
};

export default function VsAlpineIQPage() {
  return (
    <div className="min-h-screen flex flex-col pt-16 bg-white">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 px-4 md:py-32 bg-slate-50">
           <div className="container mx-auto max-w-6xl relative z-10 text-center">
            <Badge variant="outline" className="mb-6 px-4 py-1 text-sm bg-white border-primary/20 text-primary">
              BakedBot vs. Alpine IQ
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold font-teko uppercase tracking-tight mb-6">
              Stop paying <span className="text-red-600">enterprise prices</span> <br/>
              for basic loyalty.
            </h1>
             <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-10 text-balance">
              BakedBot gives you the same CRM power — <strong>plus AI agents, SEO menus, and competitive intel</strong> — for just $99/mo. 
              <br className="hidden md:block" /> No annual contracts. No hidden fees.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="h-12 px-8 text-base" asChild>
                <Link href="/get-started">Start for Free</Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 text-base" asChild>
                <Link href="/demo-shop">See the Difference</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              No credit card required for free tier.
            </p>
          </div>
          
          {/* Background decoration */}
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/3 w-[600px] h-[600px] bg-blue-100/50 rounded-full blur-3xl pointer-events-none" />
        </section>

        {/* The Direct Comparison */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold font-teko uppercase mb-4">The "Unfair" Comparison</h2>
              <p className="text-lg text-muted-foreground">
                Alpine IQ is a great CRM. But you need more than just a CRM to win.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-100">
                    <th className="p-4 text-left w-1/3">Feature</th>
                    <th className="p-4 text-center w-1/3 bg-slate-50/50 rounded-t-xl">
                      <div className="text-slate-500 font-semibold mb-1">Alpine IQ</div>
                      <div className="text-sm text-slate-400">Legacy Tool</div>
                    </th>
                    <th className="p-4 text-center w-1/3 bg-primary/5 rounded-t-xl border-t-2 border-primary">
                      <div className="text-primary font-bold text-xl mb-1">BakedBot AI</div>
                      <div className="text-sm text-primary/80">Agentic Commerce OS</div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Row 1: Price */}
                  <tr className="">
                    <td className="p-4 font-semibold text-slate-900">Starting Price</td>
                    <td className="p-4 text-center text-slate-600 bg-slate-50/30">$45 - $79 (Limited)</td>
                    <td className="p-4 text-center font-bold text-primary bg-primary/5 border-x border-primary/10">$0 (Free Tier)</td>
                  </tr>
                  {/* Row 2: Contracts */}
                  <tr>
                    <td className="p-4 font-semibold text-slate-900">Contracts</td>
                    <td className="p-4 text-center text-slate-600 bg-slate-50/30">Often Annual</td>
                    <td className="p-4 text-center font-bold text-primary bg-primary/5 border-x border-primary/10">Monthly / Cancel Anytime</td>
                  </tr>
                  {/* Row 3: AI Budtender */}
                  <tr>
                    <td className="p-4 font-semibold text-slate-900 flex items-center gap-2">
                       <Bot className="w-4 h-4 text-primary" /> AI Budtender (Chat)
                    </td>
                    <td className="p-4 text-center text-slate-600 bg-slate-50/30">Requires "Terpli" Add-on ($$$)</td>
                    <td className="p-4 text-center bg-primary/5 border-x border-primary/10">
                      <div className="flex items-center justify-center gap-2 font-semibold text-green-700">
                        <Check className="w-5 h-5" /> Included
                      </div>
                    </td>
                  </tr>
                   {/* Row 4: Headless Menu */}
                   <tr>
                    <td className="p-4 font-semibold text-slate-900 flex items-center gap-2">
                       <Zap className="w-4 h-4 text-primary" /> SEO-First Menu
                    </td>
                    <td className="p-4 text-center text-slate-400 bg-slate-50/30">
                       <div className="flex items-center justify-center gap-2">
                        <X className="w-5 h-5" /> No (iFrame/Script)
                      </div>
                    </td>
                    <td className="p-4 text-center bg-primary/5 border-x border-primary/10">
                      <div className="flex items-center justify-center gap-2 font-semibold text-green-700">
                        <Check className="w-5 h-5" /> Native Headless
                      </div>
                    </td>
                  </tr>
                   {/* Row 5: Competitive Intel */}
                   <tr>
                    <td className="p-4 font-semibold text-slate-900 flex items-center gap-2">
                       <BarChart3 className="w-4 h-4 text-primary" /> Competitor Spy
                    </td>
                    <td className="p-4 text-center text-slate-400 bg-slate-50/30">
                      <div className="flex items-center justify-center gap-2">
                        <X className="w-5 h-5" /> No
                      </div>
                    </td>
                    <td className="p-4 text-center bg-primary/5 border-x border-primary/10">
                      <div className="flex items-center justify-center gap-2 font-semibold text-green-700">
                        <Check className="w-5 h-5" /> Included (Ezal)
                      </div>
                    </td>
                  </tr>
                   {/* Row 6: Compliance */}
                   <tr>
                    <td className="p-4 font-semibold text-slate-900 flex items-center gap-2">
                       <ShieldCheck className="w-4 h-4 text-primary" /> Compliance Checks
                    </td>
                    <td className="p-4 text-center text-slate-600 bg-slate-50/30">Basic SMS Limits</td>
                    <td className="p-4 text-center bg-primary/5 border-x border-primary/10">
                      <div className="flex items-center justify-center gap-2 font-semibold text-green-700">
                        <Check className="w-5 h-5" /> Full Audit OS (Deebo)
                      </div>
                    </td>
                  </tr>
                   {/* Row 7: Discovery */}
                   <tr>
                    <td className="p-4 font-semibold text-slate-900">Discovery Pages</td>
                    <td className="p-4 text-center text-slate-400 bg-slate-50/30">
                       <div className="flex items-center justify-center gap-2">
                        <X className="w-5 h-5" /> No
                      </div>
                    </td>
                    <td className="p-4 text-center bg-primary/5 border-x border-primary/10 border-b border-primary">
                      <div className="flex items-center justify-center gap-2 font-semibold text-green-700">
                        <Check className="w-5 h-5" /> ZIP Code MOAT
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

             <div className="mt-12 text-center">
                <Link href="/pricing" className="text-primary hover:underline font-medium">
                  See full pricing details →
                </Link>
             </div>
          </div>
        </section>

        {/* Feature Deep Dive */}
         <section className="py-20 bg-slate-900 text-white">
          <div className="container mx-auto max-w-6xl px-4">
            <h2 className="text-3xl md:text-4xl font-bold font-teko uppercase text-center mb-16">
              Why "Good Enough" Isn't Enough Anymore
            </h2>

            <div className="grid md:grid-cols-3 gap-8">
              <Card className="bg-slate-800 border-slate-700 text-slate-100">
                <CardHeader>
                  <Bot className="w-10 h-10 text-emerald-400 mb-4" />
                  <CardTitle>Don't Just Message. Sell.</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-300">
                    Alpine IQ is great at sending texts. But <strong>Smokey (our AI)</strong> actually has conversations. It answers product questions, makes recommendations, and builds carts 24/7.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700 text-slate-100">
                <CardHeader>
                  <Zap className="w-10 h-10 text-yellow-400 mb-4" />
                   <CardTitle>Own Your Traffic</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-300">
                    Competitors use iFrames that hide your menu from Google. BakedBot uses <strong>Headless SEO technology</strong> to make sure YOUR product pages rank for "dispensary near me."
                  </p>
                </CardContent>
              </Card>

               <Card className="bg-slate-800 border-slate-700 text-slate-100">
                <CardHeader>
                  <BarChart3 className="w-10 h-10 text-blue-400 mb-4" />
                   <CardTitle>Spy on the Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-300">
                    Only BakedBot includes <strong>Ezal</strong>, an agent that watches your local competitors' menus and prices daily, so you never lose on price again.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-4 text-center bg-gradient-to-b from-white to-slate-50">
          <div className="container mx-auto max-w-3xl">
            <h2 className="text-4xl md:text-5xl font-bold font-teko uppercase mb-6 text-slate-900">
              Ready to upgrade your stack?
            </h2>
            <p className="text-xl text-muted-foreground mb-10">
              Join the brands who switched to get AI agents + SEO menus for one simple price.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
               <Button size="lg" className="h-14 px-8 text-lg w-full sm:w-auto" asChild>
                <Link href="/get-started">Get Started for Free</Link>
              </Button>
               <Button size="lg" variant="outline" className="h-14 px-8 text-lg w-full sm:w-auto" asChild>
                <Link href="/contact">Talk to Sales</Link>
              </Button>
            </div>
             <p className="mt-6 text-sm text-muted-foreground">
              Easy migration • No data loss • Keep your number
            </p>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
