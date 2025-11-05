'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { KeyRound } from "lucide-react";

export default function CannMenusSettings() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>CannMenus Integration</CardTitle>
                <CardDescription>
                    Enter your CannMenus API key to automatically sync your products.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="cannmenus-api-key">API Key</Label>
                    <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="cannmenus-api-key" type="password" placeholder="••••••••••••••••••••••••••••••••" className="pl-8" />
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                <Button>Save API Key</Button>
            </CardFooter>
        </Card>
    );
}
