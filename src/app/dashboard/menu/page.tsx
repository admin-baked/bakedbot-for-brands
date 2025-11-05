import Image from 'next/image';
import { products } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';

export default function MenuPage() {
  const categories = [...new Set(products.map((p) => p.category))];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Menu</h1>
        <p className="text-muted-foreground">
          Browse your product offerings and manage your menu.
        </p>
      </div>

      {categories.map((category) => (
        <section key={category}>
          <h2 className="mb-4 text-2xl font-semibold tracking-tight">{category}</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products
              .filter((p) => p.category === category)
              .map((product) => (
                <Card key={product.id} className="flex flex-col overflow-hidden transition-shadow hover:shadow-lg">
                  <div className="relative h-56 w-full">
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover"
                      data-ai-hint={product.imageHint}
                    />
                  </div>
                  <CardHeader>
                    <CardTitle>{product.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col justify-end gap-4">
                    <div className="flex items-center justify-between">
                      <p className="text-2xl font-bold text-primary">{`$${product.price.toFixed(2)}`}</p>
                    </div>
                    <Button className="w-full">
                      <ShoppingCart className="mr-2 h-4 w-4" /> Add to Cart
                    </Button>
                  </CardContent>
                </Card>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
