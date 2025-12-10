
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';

export default function LoyaltyPage() {
    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <Button variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                </Button>
            </div>

            <div className="grid gap-6">
                <div className="grid gap-4 md:grid-cols-3">
                    <div className="p-6 border rounded-lg bg-card">
                        <h3 className="font-semibold text-lg">Points Balance</h3>
                        <p className="text-3xl font-bold mt-2">--</p>
                        <p className="text-sm text-muted-foreground">Total outstanding points</p>
                    </div>
                    <div className="p-6 border rounded-lg bg-card">
                        <h3 className="font-semibold text-lg">Active Members</h3>
                        <p className="text-3xl font-bold mt-2">--</p>
                        <p className="text-sm text-muted-foreground">Enrolled customers</p>
                    </div>
                    <div className="p-6 border rounded-lg bg-card">
                        <h3 className="font-semibold text-lg">Redemption Rate</h3>
                        <p className="text-3xl font-bold mt-2">--%</p>
                        <p className="text-sm text-muted-foreground">Last 30 days</p>
                    </div>
                </div>

                <div className="p-8 border rounded-lg bg-card text-center text-muted-foreground">
                    Loyalty program configuration is coming soon.
                </div>
            </div>
        </div>
    );
}
