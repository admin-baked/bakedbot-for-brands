
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function BundlesPage() {
    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Bundle
                </Button>
            </div>

            <div className="grid gap-4">
                <div className="p-8 border rounded-lg bg-card text-center text-muted-foreground">
                    No bundles created yet. Click "Create Bundle" to get started.
                </div>
            </div>
        </div>
    );
}
