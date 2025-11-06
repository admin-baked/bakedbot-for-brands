
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package } from 'lucide-react';

export default function ProductsPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Products</h1>
        <p className="text-muted-foreground">
          Manage your product catalog, view inventory, and edit details.
        </p>
      </div>
      <Card className="flex h-96 flex-col items-center justify-center border-dashed">
        <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          <CardTitle>Product Management Coming Soon</CardTitle>
          <CardDescription>
            This section is under construction. Soon you'll be able to manage your entire product catalog from here.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
