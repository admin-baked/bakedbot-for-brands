
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brand } from "@/types/domain";

interface BrandAboutProps {
    brand: Brand;
}

export function BrandAbout({ brand }: BrandAboutProps) {
    const defaultDescription = `Welcome to the official ${brand.name} page on BakedBot. Discover our range of premium cannabis products, find verified retailers near you, and stay updated on our latest drops.`;

    return (
        <section className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight">About {brand.name}</h2>
            <Card>
                <CardContent className="pt-6">
                    <div className="prose prose-stone max-w-none text-muted-foreground">
                        <p className="whitespace-pre-wrap">
                            {brand.description || defaultDescription}
                        </p>
                    </div>
                </CardContent>
            </Card>
        </section>
    );
}
