import Link from "next/link";
import { Check, X, Bot, Zap, Coins, Sliders } from "lucide-react";
import { Navbar } from "@/components/landing/navbar";
import { LandingFooter } from "@/components/landing/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "BakedBot vs Terpli | Smarter AI Budtender at 1/5th the Price",
  description: "Compare BakedBot's Smokey AI against Terpli. Get a fully conversational AI budtender plus a complete commerce OS for $99/mo vs $499/mo.",
};

export default function VsTerpliPage() {
  return (
    <div className="min-h-screen flex flex-col pt-16 bg-white">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 px-4 md:py-32 bg-emerald-50/50">
           <div className="container mx-auto max-w-6xl relative z-10 text-center">
            <Badge variant="outline" className="mb-6 px-4 py-1 text-sm bg-white border-primary/20 text-primary">
              BakedBot vs. Terpli (Alpine IQ)
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold font-teko uppercase tracking-tight mb-6">
              Smarter AI. <span className="text-emerald-600">1/5th the Price.</span>
            </h1>
             <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-10 text-balance">
              Terpli charges ~$499/mo just for a recommendation quiz. <br />
              BakedBot gives you a <strong>conversational AI agent + headless menu + CRM</strong> for $99.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="h-12 px-8 text-base bg-emerald-600 hover:bg-emerald-700" asChild>
                <Link href="/get-started">Start for Free</Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 text-base" asChild>
                <Link href="/demo-shop">Chat with Smokey</Link>
              </Button>
            </div>
          </div>
          
           {/* Background decoration */}
           <div className="absolute inset-0 z-0">
             <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-emerald-200/20 rounded-full blur-3xl opacity-50 animate-pulse" />
             <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-50" />
           </div>
        </section>

        {/* The Direct Comparison */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-4xl">
            <div className="overflow-x-auto shadow-xl rounded-2xl border border-slate-100">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="p-6 text-left w-1/3 text-lg">Comparison</th>
                    <th className="p-6 text-center w-1/3 border-r border-slate-700">
                      <div className="font-semibold text-slate-300 mb-1">Terpli</div>
                      <div className="text-xs uppercase tracking-wider opacity-60">The Widget</div>
                    </th>
                    <th className="p-6 text-center w-1/3 bg-primary text-white">
                      <div className="font-bold text-xl mb-1">BakedBot AI</div>
                      <div className="text-xs uppercase tracking-wider opacity-90">The Platform</div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {/* Row 1: Price */}
                  <tr>
                    <td className="p-5 font-semibold text-slate-900 flex items-center gap-2">
                        <Coins className="w-5 h-5 text-muted-foreground" /> Monthly Cost
                    </td>
                    <td className="p-5 text-center text-slate-600 text-lg">~$499/mo</td>
                    <td className="p-5 text-center font-bold text-emerald-600 text-xl bg-emerald-50/30">$99/mo</td>
                  </tr>
                   {/* Row 2: Interaction Type */}
                   <tr>
                    <td className="p-5 font-semibold text-slate-900 flex items-center gap-2">
                         <Sliders className="w-5 h-5 text-muted-foreground" /> Interaction
                    </td>
                    <td className="p-5 text-center text-slate-600">Static Quiz (Multiple Choice)</td>
                    <td className="p-5 text-center font-semibold text-emerald-700 bg-emerald-50/30">Natural Language Chat</td>
                  </tr>
                   {/* Row 3: Menu Integration */}
                   <tr>
                    <td className="p-5 font-semibold text-slate-900 flex items-center gap-2">
                        <Zap className="w-5 h-5 text-muted-foreground" /> Menu Technology
                    </td>
                    <td className="p-5 text-center text-slate-400">
                       <span className="inline-flex items-center gap-1 text-sm"><X className="w-4 h-4" /> iFrame Widget (No SEO)</span>
                    </td>
                    <td className="p-5 text-center bg-emerald-50/30">
                       <span className="inline-flex items-center gap-1 font-semibold text-emerald-700"><Check className="w-4 h-4" /> Headless SEO Menu</span>
                    </td>
                  </tr>
                   {/* Row 4: Agent Family */}
                   <tr>
                    <td className="p-5 font-semibold text-slate-900 flex items-center gap-2">
                        <Bot className="w-5 h-5 text-muted-foreground" /> Team Size
                    </td>
                    <td className="p-5 text-center text-slate-400">
                        <span className="inline-flex items-center gap-1 text-sm">1 Bot (Budtender Only)</span>
                    </td>
                    <td className="p-5 text-center bg-emerald-50/30">
                       <span className="inline-flex items-center gap-1 font-semibold text-emerald-700"><Check className="w-4 h-4" /> 7 Specialized Agents</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* The "Why Chat Beats Quiz" Section */}
         <section className="py-20 bg-slate-50">
          <div className="container mx-auto max-w-6xl px-4">
            <h2 className="text-3xl md:text-4xl font-bold font-teko uppercase text-center mb-16 text-slate-900">
              Why Smokey Wins the Conversation
            </h2>

            <div className="grid md:grid-cols-3 gap-8">
              <Card className="border-none shadow-md bg-white">
                <CardHeader>
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-4 text-emerald-600">
                    <Bot className="w-6 h-6" />
                  </div>
                  <CardTitle className="text-xl">Beyond "Sativa or Indica?"</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Quizzes force customers into boxes. Smokey understands open-ended questions like "I need something for creativity without the anxiety."
                  </p>
                </CardContent>
              </Card>

              <Card className="border-none shadow-md bg-white">
                <CardHeader>
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4 text-blue-600">
                    <Zap className="w-6 h-6" />
                  </div>
                   <CardTitle className="text-xl">SEO That Actually Ranks</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Terpli lives in a popup. BakedBot generates thousands of indexable product pages that capture traffic from Google and feed it to Smokey.
                  </p>
                </CardContent>
              </Card>

               <Card className="border-none shadow-md bg-white">
                <CardHeader>
                   <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-4 text-amber-600">
                    <Coins className="w-6 h-6" />
                  </div>
                   <CardTitle className="text-xl">Save $4,800 a Year</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    That's the difference between $499/mo and $99/mo. Invest that savings into inventory, staff, or marketing—not widget fees.
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
              Hire Smokey Today.
            </h2>
            <p className="text-xl text-muted-foreground mb-10">
              The smartest budtender in the world works for $99/month.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
               <Button size="lg" className="h-14 px-8 text-lg w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700" asChild>
                <Link href="/get-started">Deploy Smokey (Free Trial)</Link>
              </Button>
               <Button size="lg" variant="ghost" className="h-14 px-8 text-lg w-full sm:w-auto" asChild>
                <Link href="/pricing">View All Plans</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
