
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, GraduationCap, Trophy, Users, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';

export const metadata = {
    title: 'BakedBot for Budtenders | Free Forever',
    description: 'The ultimate tool for cannabis professionals. Learn, earn, and grow your career with AI-powered tools.',
};

export default function BudtenderLandingPage() {
    return (
        <div className="flex flex-col min-h-screen">
            {/* Hero Section */}
            <section className="relative py-20 lg:py-32 overflow-hidden bg-gradient-to-b from-emerald-50 to-background">
                <div className="container px-4 md:px-6 relative z-10">
                    <div className="flex flex-col items-center text-center space-y-8">
                        <Badge variant="secondary" className="px-4 py-2 text-sm bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200">
                            <Sparkles className="w-4 h-4 mr-2" />
                            Free Forever for Budtenders
                        </Badge>
                        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl max-w-4xl bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-500">
                            The Operating System for <span className="text-foreground">Cannabis Pros</span>
                        </h1>
                        <p className="mx-auto max-w-[700px] text-muted-foreground text-lg md:text-xl leading-relaxed">
                            Supercharge your product knowledge, delight customers, and track your career growth. 
                            BakedBot puts an AI expert in your pocket—completely free.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                            <Button size="lg" className="h-12 px-8 text-lg bg-emerald-600 hover:bg-emerald-700 shadow-lg" asChild>
                                <Link href="/login">
                                    Create Free Account <ArrowRight className="ml-2 h-5 w-5" />
                                </Link>
                            </Button>
                            <Button size="lg" variant="outline" className="h-12 px-8 text-lg border-2" asChild>
                                <Link href="/demo">
                                    Try the Demo
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>
                
                {/* Background Decoration */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 opacity-30 pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-400 blur-[100px]" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-400 blur-[100px]" />
                </div>
            </section>

            {/* Features Section */}
            <section className="py-20 bg-background">
                <div className="container px-4 md:px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Everything you need to succeed</h2>
                        <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
                            We've built a suite of tools dedicated to making your shift easier and your recommendations smarter.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <Card className="border-2 hover:border-emerald-500 transition-all duration-300 hover:shadow-xl">
                            <CardHeader>
                                <div className="w-12 h-12 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
                                    <Zap className="h-6 w-6" />
                                </div>
                                <CardTitle className="text-xl">Instant Answers</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">
                                    Never get stumped by a customer question again. Smokey (AI) gives you instant facts on terpenes, effects, and inventory.
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="border-2 hover:border-purple-500 transition-all duration-300 hover:shadow-xl">
                            <CardHeader>
                                <div className="w-12 h-12 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center mb-4">
                                    <GraduationCap className="h-6 w-6" />
                                </div>
                                <CardTitle className="text-xl">Micro-Learning</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">
                                    Learn about new brands and products in seconds. Master the menu and become the go-to expert in your shop.
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="border-2 hover:border-amber-500 transition-all duration-300 hover:shadow-xl">
                            <CardHeader>
                                <div className="w-12 h-12 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
                                    <Trophy className="h-6 w-6" />
                                </div>
                                <CardTitle className="text-xl">Career Portfolio</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">
                                    Track your sales impact (coming soon) and build a digital portfolio that proves your value to any employer.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Value Props List */}
            <section className="py-20 bg-muted/30">
                <div className="container px-4 md:px-6">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div className="space-y-6">
                            <h2 className="text-3xl font-bold tracking-tighter">Why join the BakedBot Network?</h2>
                            <ul className="space-y-4">
                                {[
                                    "100% Free for Budtenders, always.",
                                    "Private & Secure - Your data belongs to you.",
                                    "Access to brand-exclusive training content.",
                                    "Connect with a community of top-tier pros.",
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3">
                                        <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                                        <span className="text-lg">{item}</span>
                                    </li>
                                ))}
                            </ul>
                            <div className="pt-4">
                                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                                    Join the Community
                                </Button>
                            </div>
                        </div>
                        <div className="relative h-[400px] rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center border border-slate-700">
                            {/* Placeholder for abstract UI or 3D element */}
                            <div className="text-center p-8">
                                <Users className="h-24 w-24 text-emerald-500 mx-auto mb-4 opacity-80" />
                                <h3 className="text-2xl font-bold text-white mb-2">Join 4,000+ Pros</h3>
                                <p className="text-slate-400">Be part of the future of cannabis retail.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 bg-emerald-900 text-white">
                <div className="container px-4 md:px-6 text-center">
                    <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl mb-6">
                        Ready to level up?
                    </h2>
                    <p className="mx-auto max-w-[600px] text-emerald-100 text-lg mb-8">
                        Join today and get instant access to the Budtender Dashboard. No credit card required.
                    </p>
                    <Button size="lg" variant="secondary" className="h-14 px-10 text-xl font-bold" asChild>
                         <Link href="/login">
                            Get Started for Free
                        </Link>
                    </Button>
                </div>
            </section>
        </div>
    );
}
