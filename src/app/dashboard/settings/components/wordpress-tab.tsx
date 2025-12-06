'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink } from 'lucide-react';
import Image from 'next/image';

const WORDPRESS_LOGO = 'https://s.w.org/style/images/about/WordPress-logotype-wmark.png';

export default function WordPressPluginTab() {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-start gap-4">
                        <div className="relative w-12 h-12 flex-shrink-0">
                            {/* Using a placeholder or Lucide icon if external image fails, but here passing the standard WP logo */}
                            <div className="w-12 h-12 bg-[#21759b] rounded-full flex items-center justify-center text-white font-bold text-2xl">W</div>
                        </div>
                        <div>
                            <CardTitle>WordPress Integration</CardTitle>
                            <CardDescription>
                                Easily add the AI Budtender and Menu to your WordPress site using our official plugin.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="border rounded-lg p-6 space-y-4">
                            <h3 className="font-medium flex items-center gap-2">
                                <Download className="h-4 w-4" /> Download Plugin
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Get the latest version of the BakedBot WordPress plugin.
                            </p>
                            <Button className="w-full" variant="outline" asChild>
                                <a href="/downloads/bakedbot-wordpress-plugin.zip" download>
                                    Download .zip
                                </a>
                            </Button>
                        </div>

                        <div className="border rounded-lg p-6 space-y-4">
                            <h3 className="font-medium flex items-center gap-2">
                                <ExternalLink className="h-4 w-4" /> Documentation
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Read our setup guide for configuring the plugin on your site.
                            </p>
                            <Button className="w-full" variant="ghost">
                                View Setup Guide
                            </Button>
                        </div>
                    </div>

                    <div className="bg-muted p-4 rounded-md">
                        <h4 className="font-medium text-sm mb-2">Installation Steps:</h4>
                        <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                            <li>Download the <strong>.zip</strong> file above.</li>
                            <li>Log in to your WordPress Admin dashboard.</li>
                            <li>Go to <strong>Plugins &gt; Add New</strong>.</li>
                            <li>Click <strong>Upload Plugin</strong> and select the file.</li>
                            <li>Activate the plugin and go to <strong>BakedBot Settings</strong> to configure.</li>
                        </ol>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
