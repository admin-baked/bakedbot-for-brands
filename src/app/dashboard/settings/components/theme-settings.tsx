
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useStore } from "@/hooks/use-store";
import { themes, type Theme } from "@/lib/themes";
import { cn } from "@/lib/utils";

export default function ThemeSettings() {
    const { theme, setTheme } = useStore();

    return (
        <Card>
            <CardHeader>
                <CardTitle>Theme Customization</CardTitle>
                <CardDescription>
                    Select a color theme for your application and chatbot widget.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <RadioGroup
                    value={theme}
                    onValueChange={(value: Theme) => setTheme(value)}
                    className="grid grid-cols-2 gap-4 sm:grid-cols-3"
                >
                    {themes.map((t) => (
                        <Label
                            key={t.name}
                            htmlFor={t.name}
                            className={cn(
                                "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground",
                                theme === t.name && "border-primary"
                            )}
                        >
                            <RadioGroupItem value={t.name} id={t.name} className="sr-only" />
                            <div className="flex items-center gap-2">
                                <span
                                    className="flex h-6 w-6 rounded-sm"
                                    style={{ backgroundColor: `hsl(${t.cssVars.light.primary})` }}
                                />
                                 <span
                                    className="flex h-6 w-6 rounded-sm"
                                    style={{ backgroundColor: `hsl(${t.cssVars.light.accent})` }}
                                />
                            </div>
                            <span className="mt-2 block w-full text-center font-semibold capitalize">
                                {t.name}
                            </span>
                        </Label>
                    ))}
                </RadioGroup>
            </CardContent>
        </Card>
    )
}
