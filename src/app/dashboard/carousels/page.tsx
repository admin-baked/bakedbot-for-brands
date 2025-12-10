
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function CarouselsPage() {
    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Carousel
                </Button>
            </div>

            <div className="grid gap-4">
                <div className="p-8 border rounded-lg bg-card text-center text-muted-foreground">
                    No carousels created yet. Call to Action.
                </div>
            </div>
        </div>
    );
}
