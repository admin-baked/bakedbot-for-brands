import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Construction } from "lucide-react";
import Link from "next/link";

export default function WorkInProgress({ title = "Coming Soon" }: { title?: string }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="mx-auto bg-muted p-4 rounded-full mb-4">
                        <Construction className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <CardTitle className="text-2xl">{title}</CardTitle>
                    <CardDescription>
                        This feature is currently under active development.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground mb-6">
                        We&apos;re crafting something special here. Check back soon for updates!
                    </p>
                    <Link href="/dashboard">
                        <Button variant="outline">Return to Dashboard</Button>
                    </Link>
                </CardContent>
            </Card>
        </div>
    );
}
