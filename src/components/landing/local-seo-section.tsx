'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Search, ArrowRight, TrendingUp } from 'lucide-react';
import Image from 'next/image';

export function LocalSeoSection() {
    return (
        <section id="solutions" className="py-24 bg-background">
            <div className="container px-4 mx-auto">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    <div className="space-y-8">
                        <div className="inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium">
                            <MapPin className="mr-2 h-4 w-4 text-primary" />
                            <span>Dominate Local Search</span>
                        </div>

                        <h2 className="text-4xl font-bold tracking-tight sm:text-5xl font-teko uppercase">
                            Own "Weed Near Me" in Every Zip Code
                        </h2>

                        <p className="text-lg text-muted-foreground">
                            BakedBot automatically generates thousands of hyper-local SEO pages for your brand.
                            We capture high-intent traffic from people searching for specific strains, edibles,
                            and deals in their neighborhood.
                        </p>

                        <div className="grid sm:grid-cols-2 gap-6">
                            <Card className="bg-secondary/5 border-none shadow-none">
                                <CardContent className="pt-6">
                                    <Search className="h-8 w-8 text-primary mb-4" />
                                    <h3 className="text-xl font-bold font-teko mb-2">Auto-Generated Pages</h3>
                                    <p className="text-sm text-muted-foreground">
                                        One click to deploy landing pages for every zip code you serve.
                                    </p>
                                </CardContent>
                            </Card>
                            <Card className="bg-secondary/5 border-none shadow-none">
                                <CardContent className="pt-6">
                                    <TrendingUp className="h-8 w-8 text-primary mb-4" />
                                    <h3 className="text-xl font-bold font-teko mb-2">Live Inventory Sync</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Pages update automatically with your real-time stock and pricing.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>

                        <Button size="lg" className="h-12 px-8 text-lg group">
                            Check Your Coverage
                            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </Button>
                    </div>

                    <div className="relative">
                        {/* Abstract representation of a map or SEO results */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent rounded-3xl transform rotate-3" />
                        <div className="relative bg-card border rounded-2xl shadow-2xl p-6 md:p-8">
                            <div className="flex items-center space-x-4 mb-8 border-b pb-4">
                                <div className="h-3 w-3 rounded-full bg-red-500" />
                                <div className="h-3 w-3 rounded-full bg-yellow-500" />
                                <div className="h-3 w-3 rounded-full bg-green-500" />
                                <div className="h-8 flex-1 bg-secondary/10 rounded-md flex items-center px-4 text-xs text-muted-foreground">
                                    weed delivery 90028
                                </div>
                            </div>

                            <div className="space-y-6">
                                {/* Simulated Google Result 1 */}
                                <div className="space-y-2">
                                    <div className="text-xs text-muted-foreground">bakedbot.ai › local › 90028</div>
                                    <div className="text-xl text-primary font-medium hover:underline cursor-pointer">
                                        Top 10 Cannabis Delivery in Hollywood (90028) | BakedBot
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        Order now from the best dispensaries near 90028. Live inventory for Stiiizy, Wyld, and more.
                                        Fast delivery in Hollywood.
                                    </div>
                                </div>

                                {/* Simulated Google Result 2 */}
                                <div className="space-y-2 opacity-60">
                                    <div className="text-xs text-muted-foreground">weedmaps.com › listings</div>
                                    <div className="text-xl font-medium text-blue-800">
                                        Dispensaries in Hollywood, CA
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        Find cannabis retailers in the Hollywood area...
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t grid grid-cols-3 gap-4 text-center">
                                <div>
                                    <div className="text-2xl font-bold text-primary">#1</div>
                                    <div className="text-xs text-muted-foreground">Rank Goal</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-primary">15k+</div>
                                    <div className="text-xs text-muted-foreground">Monthly Traffic</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-primary">3.2%</div>
                                    <div className="text-xs text-muted-foreground">Conversion</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
