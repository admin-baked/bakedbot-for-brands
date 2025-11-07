'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useStore } from "@/hooks/use-store";
import { cn } from "@/lib/utils";
import Image from "next/image";

export default function MenuSettings() {
    const { menuStyle, setMenuStyle } = useStore();

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
                    value={menuStyle}
                    onValueChange={(value: 'default' | 'alt') => setMenuStyle(value)}
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
        </Card>
    )
}
