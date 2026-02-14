
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function RankingsPage({ params }: { params: Promise<{ zipCode: string }> }) {
    const { zipCode } = await params;

    return (
        <main className="min-h-screen bg-background pb-20 container mx-auto px-4 mt-8">
            <div className="mb-8">
                <Link href={`/local/${zipCode}`} className="text-sm text-muted-foreground hover:underline mb-2 block">
                    &larr; Back to {zipCode} Overview
                </Link>
                <h1 className="text-3xl font-bold tracking-tight">Top Cannabis Brands near {zipCode}</h1>
                <p className="text-muted-foreground">
                    Based on local availability and search volume.
                </p>
            </div>

            <div className="grid gap-6">
                {/* Ranking List Placeholder */}
                <div className="p-12 border border-dashed rounded-lg text-center">
                    <h2 className="text-lg font-semibold mb-2">Rankings Coming Soon</h2>
                    <p className="text-muted-foreground">
                        We are currently collecting data for this ZIP code.
                    </p>
                </div>

                {/* Claim Hook */}
                <div className="bg-muted p-6 rounded-lg flex flex-col items-center text-center">
                    <h3 className="font-semibold">Don't see your brand?</h3>
                    <p className="text-sm text-muted-foreground mb-4 max-w-md">
                        Ensure your products are visible to local shoppers by claiming your brand page.
                    </p>
                    <Button asChild>
                        <Link href="/brands/claim">Claim Brand Presence</Link>
                    </Button>
                </div>
            </div>
        </main>
    );
}
