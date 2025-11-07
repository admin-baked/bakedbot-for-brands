'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export default function DataSourceSettings() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Menu Data Source</CardTitle>
                <CardDescription>
                    Your public-facing headless menu is configured to use live data from your Firestore database.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Alert>
                    <Database className="h-4 w-4" />
                    <AlertTitle>Live Data Mode Active</AlertTitle>
                    <AlertDescription>
                        The application is connected to your live Firestore product catalog. If the catalog is empty, it will automatically fall back to demo data.
                    </AlertDescription>
                </Alert>
            </CardContent>
        </Card>
    )
}
