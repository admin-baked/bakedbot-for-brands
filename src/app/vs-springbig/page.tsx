import Link from "next/link";
import { Check, X, Mail, MessageSquare, Zap, Target } from "lucide-react";
import { Navbar } from "@/components/landing/navbar";
import { LandingFooter } from "@/components/landing/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";

export const metadata = {
  title: "BakedBot vs Springbig | Marketing + AI for Half the Price",
  description: "Springbig is great for texts. BakedBot includes texts, email, AI agents, and SEO menus—for less.",
};

export default function VsSpringbigPage() {
  return (
    <div className="min-h-screen flex flex-col pt-16 bg-white">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 px-4 md:py-32 bg-fuchsia-50/50">
           <div className="container mx-auto max-w-6xl relative z-10 text-center">
            <Badge variant="outline" className="mb-6 px-4 py-1 text-sm bg-white border-primary/20 text-primary">
              BakedBot vs. Springbig
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold font-teko uppercase tracking-tight mb-6">
              Marketing + AI. <span className="text-fuchsia-600">Half the Price.</span>
            </h1>
             <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-10 text-balance">
              Springbig charges hundreds for just SMS & Loyalty. <br />
              BakedBot includes <strong>Marketing + AI Budtender + SEO Menus</strong> starting at $99/mo.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="h-12 px-8 text-base bg-fuchsia-600 hover:bg-fuchsia-700" asChild>
                <Link href="/get-started">Start for Free</Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 text-base" asChild>
                <Link href="/pricing">Compare Plans</Link>
              </Button>
            </div>
             <p className="mt-4 text-sm text-muted-foreground">
              Includes 30-day money-back guarantee.
            </p>
          </div>
          
           {/* Background decoration */}
           <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 w-[600px] h-[600px] bg-fuchsia-200/30 rounded-full blur-3xl pointer-events-none" />
           <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/3 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        </section>

        {/* The Comparison Matrix */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-5xl">
            

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-100">
                    <th className="p-4 text-left w-1/3">Feature</th>
                    <th className="p-4 text-center w-1/3 bg-slate-50/50 rounded-t-xl">
                      <div className="text-slate-500 font-semibold mb-1">Springbig</div>
                      <div className="text-sm text-slate-400">Marketing Only</div>
                    </th>
                    <th className="p-4 text-center w-1/3 bg-fuchsia-50/30 rounded-t-xl border-t-2 border-fuchsia-500">
                      <div className="text-fuchsia-700 font-bold text-xl mb-1">BakedBot AI</div>
                      <div className="text-sm text-fuchsia-600/80">All-in-One Growth</div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Row 1: Marketing */}
                  <tr className="">
                    <td className="p-4 font-semibold text-slate-900 flex items-center gap-2">
                         <Mail className="w-4 h-4 text-fuchsia-600" /> SMS & Email Marketing
                    </td>
                    <td className="p-4 text-center bg-slate-50/30"><Check className="w-5 h-5 mx-auto text-green-600" /></td>
                    <td className="p-4 text-center bg-fuchsia-50/10 border-x border-fuchsia-100"><Check className="w-5 h-5 mx-auto text-green-600" /></td>
                  </tr>
                  {/* Row 2: Loyalty */}
                  <tr>
                    <td className="p-4 font-semibold text-slate-900 flex items-center gap-2">
                        <Target className="w-4 h-4 text-fuchsia-600" /> Loyalty Program
                    </td>
                    <td className="p-4 text-center bg-slate-50/30"><Check className="w-5 h-5 mx-auto text-green-600" /></td>
                    <td className="p-4 text-center bg-fuchsia-50/10 border-x border-fuchsia-100"><Check className="w-5 h-5 mx-auto text-green-600" /></td>
                  </tr>
                   {/* Row 3: AI Agents */}
                   <tr>
                    <td className="p-4 font-semibold text-slate-900 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-fuchsia-600" /> AI Budtender (Chat)
                    </td>
                    <td className="p-4 text-center text-slate-400 bg-slate-50/30">
                       <div className="flex items-center justify-center gap-2">
                        <X className="w-5 h-5" /> No
                      </div>
                    </td>
                    <td className="p-4 text-center bg-fuchsia-50/10 border-x border-fuchsia-100">
                      <div className="flex items-center justify-center gap-2 font-semibold text-green-700">
                        <Check className="w-5 h-5" /> Included
                      </div>
                    </td>
                  </tr>
                   {/* Row 4: Menu */}
                   <tr>
                    <td className="p-4 font-semibold text-slate-900 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-fuchsia-600" /> Headless Menu
                    </td>
                    <td className="p-4 text-center text-slate-400 bg-slate-50/30">
                       <div className="flex items-center justify-center gap-2">
                        <X className="w-5 h-5" /> No
                      </div>
                    </td>
                    <td className="p-4 text-center bg-fuchsia-50/10 border-x border-fuchsia-100">
                      <div className="flex items-center justify-center gap-2 font-semibold text-green-700">
                        <Check className="w-5 h-5" /> Included
                      </div>
                    </td>
                  </tr>
                   {/* Row 5: Price */}
                   <tr className="bg-slate-50/50">
                    <td className="p-4 font-bold text-slate-900">Est. Monthly Cost</td>
                    <td className="p-4 text-center font-semibold text-slate-600">$199 - $499+</td>
                    <td className="p-4 text-center font-bold text-fuchsia-700 text-xl border-x border-b border-fuchsia-100">$99/mo</td>
                  </tr>
                </tbody>
              </table>
            </div>

             <div className="mt-8 bg-slate-100 rounded-lg p-4 text-center text-sm text-slate-600 max-w-2xl mx-auto">
                "We switched from Springbig because paying a separate bill for loyalty, another for menu, and another for chat didn't make sense. BakedBot does it all."
             </div>
          </div>
        </section>

        {/* Feature Deep Dive */}
         <section className="py-20 bg-white">
          <div className="container mx-auto max-w-6xl px-4">
            <h2 className="text-3xl md:text-4xl font-bold font-teko uppercase text-center mb-16">
              Marketing Needs a Menu. And AI.
            </h2>

            <div className="grid md:grid-cols-3 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">The "Dead End" Text</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Springbig sends texts that link to a generic menu. BakedBot sends texts that link to <strong>AI-personalized product pages</strong> where Smokey is waiting to close the sale.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                   <CardTitle className="text-xl">Compliance is Built-In</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Don't worry about TCPA lawsuits. Our <strong>Deebo agent</strong> pre-checks every campaign against jurisdiction rules before it sends.
                  </p>
                </CardContent>
              </Card>

               <Card>
                <CardHeader>
                   <CardTitle className="text-xl">One Dashboard. One Bill.</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Stop toggling between 5 tabs. Manage your menu, your marketing, your chat, and your analytics in one Agent Workspace.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-4 text-center bg-slate-900 text-white">
          <div className="container mx-auto max-w-3xl">
            <h2 className="text-4xl md:text-5xl font-bold font-teko uppercase mb-6">
              Consolidate & Save.
            </h2>
            <p className="text-xl text-slate-300 mb-10">
              Get more features for less money. Switch to BakedBot today.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
               <Button size="lg" className="h-14 px-8 text-lg w-full sm:w-auto bg-fuchsia-600 hover:bg-fuchsia-700 text-white border-none" asChild>
                <Link href="/get-started">Start for Free</Link>
              </Button>
               <Button size="lg" variant="outline" className="h-14 px-8 text-lg w-full sm:w-auto bg-transparent border-slate-600 text-white hover:bg-slate-800 hover:text-white" asChild>
                <Link href="/demo-shop">See Live Demo</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
