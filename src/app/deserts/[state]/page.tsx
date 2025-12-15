
import { fetchDesertData, fetchStateStats } from '@/lib/desert-data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { AlertTriangle, Map, TrendingUp } from 'lucide-react';

export default async function DesertIndexPage({ params }: { params: Promise<{ state: string }> }) {
    const { state } = await params;
    const deserts = await fetchDesertData(state);
    const stats = await fetchStateStats(state);

    // Filter to true deserts (Score > 50)
    const severeDeserts = deserts.filter(d => d.underservedScore > 80);
    const moderateDeserts = deserts.filter(d => d.underservedScore > 50 && d.underservedScore <= 80);

    return (
        <main className="min-h-screen bg-background pb-20">
            {/* Hero Section */}
            <section className="bg-amber-50 border-b border-amber-100 py-16">
                <div className="container mx-auto px-4 text-center max-w-4xl">
                    <Badge variant="outline" className="mb-4 bg-amber-100 text-amber-800 border-amber-200">
                        Public Data Initiative
                    </Badge>
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 text-amber-950">
                        The {state.toUpperCase()} Cannabis Desert Index
                    </h1>
                    <p className="text-lg text-amber-900/80 mb-8 text-balance">
                        Analyzing local access gaps to identify underserved communities.
                        There are <span className="font-bold">{stats.totalDeserts}</span> ZIP codes in {state.toUpperCase()}
                        where residents drive over 20 minutes for access.
                    </p>

                    <div className="flex flex-wrap justify-center gap-4">
                        <Card className="bg-white/80 backdrop-blur">
                            <CardContent className="p-4 flex items-center gap-3">
                                <AlertTriangle className="text-orange-500 w-8 h-8" />
                                <div className="text-left">
                                    <div className="text-2xl font-bold">{stats.residentsUnderserved.toLocaleString()}</div>
                                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Residents Underserved</div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-white/80 backdrop-blur">
                            <CardContent className="p-4 flex items-center gap-3">
                                <Map className="text-blue-500 w-8 h-8" />
                                <div className="text-left">
                                    <div className="text-2xl font-bold">{stats.totalDeserts}</div>
                                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Zero-Access ZIPs</div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            <div className="container mx-auto px-4 mt-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
                <div className="lg:col-span-8 space-y-12">
                    {/* Severe Deserts Table */}
                    <section>
                        <h2 className="text-2xl font-bold mb-6 flex items-center">
                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-600 mr-3 text-sm">1</span>
                            Critical Deserts (High Demand, Zero Access)
                        </h2>
                        <Card>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>ZIP Code</TableHead>
                                        <TableHead>City</TableHead>
                                        <TableHead className="text-right">Underserved Score</TableHead>
                                        <TableHead className="text-right">Nearest Store</TableHead>
                                        <TableHead></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {severeDeserts.map((desert) => (
                                        <TableRow key={desert.zipCode}>
                                            <TableCell className="font-medium">{desert.zipCode}</TableCell>
                                            <TableCell>{desert.city}</TableCell>
                                            <TableCell className="text-right font-bold text-red-600">{desert.underservedScore}/100</TableCell>
                                            <TableCell className="text-right">{desert.distanceToNearestDispensaryMiles} mi</TableCell>
                                            <TableCell>
                                                <Button variant="ghost" size="sm" asChild>
                                                    <Link href={`/local/${desert.zipCode}`}>View Data</Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Card>
                    </section>
                </div>

                <div className="lg:col-span-4 space-y-6">
                    {/* Operator Callout */}
                    <Card className="bg-slate-900 text-white border-none shadow-xl sticky top-24">
                        <CardHeader>
                            <CardTitle className="flex items-center text-lg">
                                <TrendingUp className="w-5 h-5 mr-2 text-green-400" />
                                For Operators & Brands
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-slate-300 text-sm">
                                These areas represent the highest unlocked revenue potential in the state.
                            </p>
                            <p className="text-slate-300 text-sm">
                                Brands that target these ZIP codes with delivery partnerships see <strong>3x higher conversion</strong>.
                            </p>
                            <Button className="w-full bg-green-500 hover:bg-green-600 text-black font-semibold">
                                Target these ZIPs
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </main>
    );
}
