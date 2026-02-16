'use client';

/**
 * Brand Pages Client Component
 *
 * Tabbed interface for editing brand pages
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
    BrandPageDoc,
    BrandPageType,
    AboutPageContent,
    CareersPageContent,
    ContactPageContent,
    LoyaltyPageContent
} from '@/types/brand-pages';
import { updateBrandPage, toggleBrandPagePublish } from '@/server/actions/brand-pages';
import {
    Info, Briefcase, MapPin, Mail, Gift, FileText,
    Save, Eye, EyeOff, Plus, Trash2
} from 'lucide-react';

interface BrandPagesClientProps {
    orgId: string;
    initialPages: BrandPageDoc[];
}

export function BrandPagesClient({ orgId, initialPages }: BrandPagesClientProps) {
    const [pages, setPages] = useState<Map<BrandPageType, BrandPageDoc>>(
        new Map(initialPages.map(p => [p.pageType, p]))
    );
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    const handleSave = async (pageType: BrandPageType, content: Partial<BrandPageDoc>) => {
        setSaving(true);
        try {
            const updated = await updateBrandPage(orgId, pageType, content);
            setPages(prev => new Map(prev).set(pageType, updated));
            toast({
                title: 'Saved',
                description: `${pageType.charAt(0).toUpperCase() + pageType.slice(1)} page updated successfully.`
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to save changes. Please try again.',
                variant: 'destructive'
            });
        } finally {
            setSaving(false);
        }
    };

    const handleTogglePublish = async (pageType: BrandPageType) => {
        const page = pages.get(pageType);
        if (!page) return;

        try {
            const updated = await toggleBrandPagePublish(orgId, pageType, !page.isPublished);
            setPages(prev => new Map(prev).set(pageType, updated));
            toast({
                title: updated.isPublished ? 'Published' : 'Unpublished',
                description: `${pageType.charAt(0).toUpperCase() + pageType.slice(1)} page ${updated.isPublished ? 'is now live' : 'has been hidden'}.`
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to update publish status.',
                variant: 'destructive'
            });
        }
    };

    return (
        <div className="container mx-auto p-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold">Brand Pages</h1>
                <p className="text-muted-foreground">
                    Edit your About, Careers, Locations, Contact, Loyalty, and Press pages
                </p>
            </div>

            <Tabs defaultValue="about" className="space-y-6">
                <TabsList className="grid w-full grid-cols-6">
                    <TabsTrigger value="about" className="flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        About
                    </TabsTrigger>
                    <TabsTrigger value="careers" className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4" />
                        Careers
                    </TabsTrigger>
                    <TabsTrigger value="locations" className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Locations
                    </TabsTrigger>
                    <TabsTrigger value="contact" className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Contact
                    </TabsTrigger>
                    <TabsTrigger value="loyalty" className="flex items-center gap-2">
                        <Gift className="w-4 h-4" />
                        Loyalty
                    </TabsTrigger>
                    <TabsTrigger value="press" className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Press
                    </TabsTrigger>
                </TabsList>

                {/* About Tab */}
                <TabsContent value="about">
                    <AboutEditor
                        page={pages.get('about')!}
                        onSave={content => handleSave('about', { aboutContent: content as AboutPageContent })}
                        onTogglePublish={() => handleTogglePublish('about')}
                        saving={saving}
                    />
                </TabsContent>

                {/* Careers Tab */}
                <TabsContent value="careers">
                    <CareersEditor
                        page={pages.get('careers')!}
                        onSave={content => handleSave('careers', { careersContent: content as CareersPageContent })}
                        onTogglePublish={() => handleTogglePublish('careers')}
                        saving={saving}
                    />
                </TabsContent>

                {/* Locations Tab */}
                <TabsContent value="locations">
                    <LocationsEditor
                        page={pages.get('locations')!}
                        onSave={content => handleSave('locations', { locationsContent: content })}
                        onTogglePublish={() => handleTogglePublish('locations')}
                        saving={saving}
                    />
                </TabsContent>

                {/* Contact Tab */}
                <TabsContent value="contact">
                    <ContactEditor
                        page={pages.get('contact')!}
                        onSave={content => handleSave('contact', { contactContent: content as ContactPageContent })}
                        onTogglePublish={() => handleTogglePublish('contact')}
                        saving={saving}
                    />
                </TabsContent>

                {/* Loyalty Tab */}
                <TabsContent value="loyalty">
                    <LoyaltyEditor
                        page={pages.get('loyalty')!}
                        onSave={content => handleSave('loyalty', { loyaltyContent: content as LoyaltyPageContent })}
                        onTogglePublish={() => handleTogglePublish('loyalty')}
                        saving={saving}
                    />
                </TabsContent>

                {/* Press Tab */}
                <TabsContent value="press">
                    <PressEditor
                        page={pages.get('press')!}
                        onSave={content => handleSave('press', { pressContent: content })}
                        onTogglePublish={() => handleTogglePublish('press')}
                        saving={saving}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}

// ============================================================================
// Individual Page Editors (Simplified - just showing structure)
// ============================================================================

interface EditorProps<T> {
    page: BrandPageDoc;
    onSave: (content: T) => void;
    onTogglePublish: () => void;
    saving: boolean;
}

function AboutEditor({ page, onSave, onTogglePublish, saving }: EditorProps<AboutPageContent>) {
    const [content, setContent] = useState(page.aboutContent!);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>About Us Page</CardTitle>
                    <CardDescription>Edit your company's about page content</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant={page.isPublished ? 'default' : 'secondary'}>
                        {page.isPublished ? 'Published' : 'Draft'}
                    </Badge>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onTogglePublish}
                    >
                        {page.isPublished ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <Label>Hero Title</Label>
                    <Input
                        value={content.heroTitle || ''}
                        onChange={e => setContent({ ...content, heroTitle: e.target.value })}
                        placeholder="About Us"
                    />
                </div>
                <div>
                    <Label>Hero Description</Label>
                    <Textarea
                        value={content.heroDescription || ''}
                        onChange={e => setContent({ ...content, heroDescription: e.target.value })}
                        placeholder="Learn more about our mission and values."
                        rows={3}
                    />
                </div>
                <div>
                    <Label>Story</Label>
                    <Textarea
                        value={content.story || ''}
                        onChange={e => setContent({ ...content, story: e.target.value })}
                        placeholder="Tell your brand's story..."
                        rows={6}
                    />
                </div>
                <div className="flex justify-end">
                    <Button onClick={() => onSave(content)} disabled={saving}>
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

function CareersEditor({ page, onSave, onTogglePublish, saving }: EditorProps<CareersPageContent>) {
    const [content, setContent] = useState(page.careersContent!);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Careers Page</CardTitle>
                    <CardDescription>Manage job postings and career information</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant={page.isPublished ? 'default' : 'secondary'}>
                        {page.isPublished ? 'Published' : 'Draft'}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={onTogglePublish}>
                        {page.isPublished ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <Label>Hero Title</Label>
                    <Input
                        value={content.heroTitle || ''}
                        onChange={e => setContent({ ...content, heroTitle: e.target.value })}
                        placeholder="Join Our Team"
                    />
                </div>
                <div>
                    <Label>Apply Email</Label>
                    <Input
                        type="email"
                        value={content.applyEmail || ''}
                        onChange={e => setContent({ ...content, applyEmail: e.target.value })}
                        placeholder="careers@company.com"
                    />
                </div>
                <div className="flex justify-end">
                    <Button onClick={() => onSave(content)} disabled={saving}>
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

function LocationsEditor({ page, onSave, onTogglePublish, saving }: EditorProps<any>) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Locations Page</CardTitle>
                <CardDescription>Manage your physical locations</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">
                    Location management coming soon. For now, locations are pulled from your organization settings.
                </p>
            </CardContent>
        </Card>
    );
}

function ContactEditor({ page, onSave, onTogglePublish, saving }: EditorProps<ContactPageContent>) {
    const [content, setContent] = useState(page.contactContent!);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Contact Page</CardTitle>
                    <CardDescription>Manage contact information and form settings</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant={page.isPublished ? 'default' : 'secondary'}>
                        {page.isPublished ? 'Published' : 'Draft'}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={onTogglePublish}>
                        {page.isPublished ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <Label>General Email</Label>
                    <Input
                        type="email"
                        value={content.generalEmail || ''}
                        onChange={e => setContent({ ...content, generalEmail: e.target.value })}
                        placeholder="info@company.com"
                    />
                </div>
                <div>
                    <Label>Phone</Label>
                    <Input
                        type="tel"
                        value={content.phone || ''}
                        onChange={e => setContent({ ...content, phone: e.target.value })}
                        placeholder="(555) 123-4567"
                    />
                </div>
                <div className="flex items-center space-x-2">
                    <Switch
                        checked={content.formEnabled}
                        onCheckedChange={checked => setContent({ ...content, formEnabled: checked })}
                    />
                    <Label>Enable Contact Form</Label>
                </div>
                <div className="flex justify-end">
                    <Button onClick={() => onSave(content)} disabled={saving}>
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

function LoyaltyEditor({ page, onSave, onTogglePublish, saving }: EditorProps<LoyaltyPageContent>) {
    const [content, setContent] = useState(page.loyaltyContent!);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Loyalty/Rewards Page</CardTitle>
                    <CardDescription>Configure your loyalty program page</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant={page.isPublished ? 'default' : 'secondary'}>
                        {page.isPublished ? 'Published' : 'Draft'}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={onTogglePublish}>
                        {page.isPublished ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <Label>Program Name</Label>
                    <Input
                        value={content.program.name}
                        onChange={e => setContent({
                            ...content,
                            program: { ...content.program, name: e.target.value }
                        })}
                        placeholder="Loyalty Rewards"
                    />
                </div>
                <div>
                    <Label>Points Per Dollar</Label>
                    <Input
                        type="number"
                        value={content.program.pointsPerDollar}
                        onChange={e => setContent({
                            ...content,
                            program: { ...content.program, pointsPerDollar: parseFloat(e.target.value) }
                        })}
                        min={0}
                        step={0.1}
                    />
                </div>
                <div className="flex justify-end">
                    <Button onClick={() => onSave(content)} disabled={saving}>
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

function PressEditor({ page, onSave, onTogglePublish, saving }: EditorProps<any>) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Press & Media Page</CardTitle>
                <CardDescription>Manage press contacts and media kit</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">
                    Press page editor coming soon.
                </p>
            </CardContent>
        </Card>
    );
}
