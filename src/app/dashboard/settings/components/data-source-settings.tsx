'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useStore } from "@/hooks/use-store";
import { Database, Beaker } from "lucide-react";

export default function DataSourceSettings() {
    const { isUsingDemoData, setIsUsingDemoData } = useStore();

    return (
        <Card>
            <CardHeader>
                <CardTitle>Menu Data Source</CardTitle>
                <CardDescription>
                    Select the data source for your public-facing headless menu.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <RadioGroup
                    value={isUsingDemoData ? 'demo' : 'live'}
                    onValueChange={(value) => setIsUsingDemoData(value === 'demo')}
                    className="grid grid-cols-1 gap-4 sm:grid-cols-2"
                >
                    <div>
                        <RadioGroupItem value="demo" id="demo-data" className="peer sr-only" />
                        <Label htmlFor="demo-data" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                           <div className="flex items-center gap-4">
                             <Beaker className="h-10 w-10 text-primary" />
                             <div className="text-left">
                                <p className="font-semibold">Demo Data</p>
                                <p className="font-normal text-sm text-muted-foreground">Use the built-in static data for demonstration purposes.</p>
                             </div>
                           </div>
                        </Label>
                    </div>
                     <div>
                        <RadioGroupItem value="live" id="live-data" className="peer sr-only" />
                        <Label htmlFor="live-data" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                           <div className="flex items-center gap-4">
                             <Database className="h-10 w-10 text-primary" />
                             <div className="text-left">
                                <p className="font-semibold">Live Firestore Data</p>
                                <p className="font-normal text-sm text-muted-foreground">Use your own product catalog from the live database.</p>
                             </div>
                           </div>
                        </Label>
                    </div>
                </RadioGroup>
            </CardContent>
        </Card>
    )
}
