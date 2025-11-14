
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useStore } from "@/hooks/use-store";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function MenuSettings() {
    const { menuStyle: globalMenuStyle, setMenuStyle } = useStore();
    const { toast } = useToast();
    
    // Local state to manage selection before saving
    const [selectedStyle, setSelectedStyle] = React.useState(globalMenuStyle);

    // Sync local state if global state changes
    React.useEffect(() => {
        setSelectedStyle(globalMenuStyle);
    }, [globalMenuStyle]);

    const handleSave = () => {
        setMenuStyle(selectedStyle);
        toast({
            title: "Settings Saved",
            description: "Your public menu layout has been updated.",
        });
    };
    
    const hasChanges = selectedStyle !== globalMenuStyle;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Public Menu Layout</CardTitle>
                <CardDescription>
                    Select the layout for your public-facing headless menu.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <RadioGroup
                    value={selectedStyle}
                    onValueChange={(value: 'default' | 'alt') => setSelectedStyle(value)}
                    className="grid grid-cols-1 gap-4 sm:grid-cols-2"
                >
                    <div>
                        <RadioGroupItem value="default" id="default-menu" className="peer sr-only" />
                        <Label
                            htmlFor="default-menu"
                            className={cn(
                                "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground",
                                "peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary",
                                "cursor-pointer"
                            )}
                        >
                            <Image src="https://storage.googleapis.com/stedi-assets/misc/menu-default.png" alt="Default Menu Layout" width={400} height={200} className="rounded-md object-cover" />
                            <span className="mt-2 block w-full text-center font-semibold">
                                Default Menu
                            </span>
                        </Label>
                    </div>
                     <div>
                        <RadioGroupItem value="alt" id="alt-menu" className="peer sr-only" />
                        <Label
                            htmlFor="alt-menu"
                            className={cn(
                                "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground",
                                "peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary",
                                "cursor-pointer"
                            )}
                        >
                            <Image src="https://storage.googleapis.com/stedi-assets/misc/menu-alt.png" alt="Tiled Menu Layout" width={400} height={200} className="rounded-md object-cover" />
                            <span className="mt-2 block w-full text-center font-semibold">
                                Tiled Menu
                            </span>
                        </Label>
                    </div>
                </RadioGroup>
            </CardContent>
            <CardFooter>
                <Button onClick={handleSave} disabled={!hasChanges}>
                    Save Changes
                </Button>
            </CardFooter>
        </Card>
    )
}
