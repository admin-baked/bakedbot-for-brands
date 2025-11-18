

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, BarChart, ShoppingBag, Lightbulb } from 'lucide-react';
import Image from "next/image";
import Link from 'next/link';

const features = [
  {
    icon: ShoppingBag,
    title: 'Headless Product Menu',
    description: 'A fully customizable, embeddable menu system that works with any website or platform.',
  },
  {
    icon: Lightbulb,
    title: 'AI Budtender Chatbot',
    description: 'Guide customers to the perfect product with an AI assistant that understands their needs.',
  },
  {
    icon: BarChart,
    title: 'Actionable Insights',
    description: 'Understand customer behavior and product performance with a clear, concise dashboard.',
  },
];

export default function BrandsHomepage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative w-full h-[60vh] min-h-[400px] text-white">
        <Image
            src="https://images.unsplash.com/photo-1551650975-87deedd944c3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxfHxjaGF0Ym90JTIwbW9iaWxlfGVufDB8fHx8MTc2MjQ0ODc4NHww&ixlib=rb-4.1.0&q=80&w=1080"
            alt="AI Chatbot on a mobile phone"
            fill
            className="object-cover"
            priority
            data-ai-hint="chatbot mobile"
        />
        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-center p-4">
          <h1 className="text-4xl md:text-6xl font-bold font-teko tracking-wider uppercase drop-shadow-lg">
            Keep the customer in your brand funnel
          </h1>
          <p className="mt-4 max-w-2xl text-lg md:text-xl font-light">
            BakedBot is an all-in-one headless menu and AI toolkit that embeds directly into your brand's ecosystem, turning every interaction into a sales opportunity.
          </p>
          <div className="mt-8 flex gap-4">
            <Button asChild size="lg">
              <Link href="/onboarding">Get Started</Link>
            </Button>
            <Button asChild variant="outline" className="bg-transparent text-white border-white hover:bg-white hover:text-black">
              <Link href="/menu/default">View Demo</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-2 mb-12">
            <h2 className="text-3xl font-bold tracking-tight">Everything You Need, Nothing You Don’t</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              From AI-powered recommendations to a seamless checkout experience, BakedBot provides the tools to own your customer journey from start to finish.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div key={feature.title} className="text-center">
                <div className="flex items-center justify-center mb-4">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <feature.icon className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold">{feature.title}</h3>
                <p className="mt-2 text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 md:py-24 bg-muted/40">
          <div className="container mx-auto px-4">
               <div className="text-center space-y-2 mb-12">
                  <h2 className="text-3xl font-bold tracking-tight">Simple, Transparent Pricing</h2>
                  <p className="text-muted-foreground max-w-xl mx-auto">
                      Start for free and scale as you grow. No hidden fees, no surprises.
                  </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                  <Card className="flex flex-col">
                      <CardHeader>
                          <CardTitle>Starter</CardTitle>
                      </CardHeader>
                      <CardContent className="flex-1 space-y-4">
                          <p className="text-4xl font-bold">$0<span className="text-lg font-normal text-muted-foreground">/mo</span></p>
                          <p className="text-muted-foreground">Perfect for getting started and exploring the platform.</p>
                          <ul className="space-y-2 text-sm">
                              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" /> Headless Menu</li>
                              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" /> Basic AI Chatbot</li>
                              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" /> 1 Brand Profile</li>
                          </ul>
                      </CardContent>
                      <div className="p-6 pt-0">
                          <Button className="w-full" asChild>
                             <Link href="/onboarding">Get Started for Free</Link>
                          </Button>
                      </div>
                  </Card>
                   <Card className="flex flex-col border-primary ring-2 ring-primary">
                      <CardHeader>
                          <CardTitle>Pro</CardTitle>
                      </CardHeader>
                      <CardContent className="flex-1 space-y-4">
                           <p className="text-4xl font-bold">$99<span className="text-lg font-normal text-muted-foreground">/mo</span></p>
                           <p className="text-muted-foreground">For growing brands that need advanced AI and customization.</p>
                           <ul className="space-y-2 text-sm">
                              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" /> Everything in Starter, plus:</li>
                              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" /> AI Content Generation Suite</li>
                              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" /> Advanced Chatbot Customization</li>
                              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" /> Custom Domain Support</li>
                          </ul>
                      </CardContent>
                      <div className="p-6 pt-0">
                          <Button className="w-full">Choose Pro</Button>
                      </div>
                  </Card>
              </div>
          </div>
      </section>
    </>
  );
}
