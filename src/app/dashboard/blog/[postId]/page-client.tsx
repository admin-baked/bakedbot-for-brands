'use client';

/**
 * Blog Post Editor Client Component  *
 * Full-featured editor with markdown, SEO, compliance, and publishing controls
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BlogPost, BlogCategory, BlogStatus } from '@/types/blog';
import { createBlogPost, updateBlogPost, publishBlogPost } from '@/server/actions/blog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import {
    ArrowLeft,
    Save,
    Eye,
    Send,
    Sparkles,
    Image as ImageIcon,
    AlertCircle,
    CheckCircle,
} from 'lucide-react';

interface BlogPostEditorClientProps {
    orgId: string;
    userId: string;
    userEmail: string;
    post: BlogPost | null;
}

const CATEGORY_OPTIONS: { value: BlogCategory; label: string }[] = [
    { value: 'education', label: 'Education' },
    { value: 'product_spotlight', label: 'Product Spotlight' },
    { value: 'industry_news', label: 'Industry News' },
    { value: 'company_update', label: 'Company Update' },
    { value: 'strain_profile', label: 'Strain Profile' },
    { value: 'compliance', label: 'Compliance' },
    { value: 'cannabis_culture', label: 'Cannabis Culture' },
    { value: 'wellness', label: 'Wellness' },
];

export function BlogPostEditorClient({
    orgId,
    userId,
    userEmail,
    post,
}: BlogPostEditorClientProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);

    // Form state
    const [title, setTitle] = useState(post?.title || '');
    const [subtitle, setSubtitle] = useState(post?.subtitle || '');
    const [excerpt, setExcerpt] = useState(post?.excerpt || '');
    const [content, setContent] = useState(post?.content || '');
    const [category, setCategory] = useState<BlogCategory>(post?.category || 'education');
    const [tags, setTags] = useState<string[]>(post?.tags || []);
    const [tagInput, setTagInput] = useState('');

    // SEO state
    const [seoTitle, setSeoTitle] = useState(post?.seo.title || '');
    const [metaDescription, setMetaDescription] = useState(post?.seo.metaDescription || '');
    const [slug, setSlug] = useState(post?.seo.slug || '');
    const [keywords, setKeywords] = useState<string[]>(post?.seo.keywords || []);
    const [keywordInput, setKeywordInput] = useState('');

    // Auto-save timer
    useEffect(() => {
        if (!post) return; // Don't auto-save new posts

        const timer = setTimeout(() => {
            handleSaveDraft(true); // Silent save
        }, 30000); // 30 seconds

        return () => clearTimeout(timer);
    }, [title, content, excerpt]); // Debounce on content changes

    // Auto-generate SEO fields from title
    useEffect(() => {
        if (!seoTitle && title) {
            setSeoTitle(title.substring(0, 60));
        }
        if (!slug && title) {
            const generatedSlug = title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '');
            setSlug(generatedSlug);
        }
    }, [title]);

    // Auto-generate meta description from excerpt
    useEffect(() => {
        if (!metaDescription && excerpt) {
            setMetaDescription(excerpt.substring(0, 160));
        }
    }, [excerpt]);

    const handleAddTag = () => {
        if (tagInput.trim() && !tags.includes(tagInput.trim())) {
            setTags([...tags, tagInput.trim()]);
            setTagInput('');
        }
    };

    const handleRemoveTag = (tag: string) => {
        setTags(tags.filter(t => t !== tag));
    };

    const handleAddKeyword = () => {
        if (keywordInput.trim() && !keywords.includes(keywordInput.trim())) {
            setKeywords([...keywords, keywordInput.trim()]);
            setKeywordInput('');
        }
    };

    const handleRemoveKeyword = (keyword: string) => {
        setKeywords(keywords.filter(k => k !== keyword));
    };

    const handleSaveDraft = async (silent = false) => {
        if (!title.trim()) {
            if (!silent) {
                toast({
                    title: 'Title required',
                    description: 'Please enter a title for your post',
                    variant: 'destructive',
                });
            }
            return;
        }

        setIsSaving(true);

        try {
            const postData = {
                title,
                subtitle,
                excerpt: excerpt || title.substring(0, 200),
                content,
                category,
                tags,
                author: post?.author || {
                    id: userId,
                    name: userEmail,
                },
                seo: {
                    title: seoTitle || title,
                    metaDescription: metaDescription || excerpt.substring(0, 160),
                    slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                    keywords,
                },
            };

            if (post) {
                // Update existing post
                await updateBlogPost(post.id, postData);
                if (!silent) {
                    toast({
                        title: 'Draft saved',
                        description: 'Your changes have been saved',
                    });
                }
            } else {
                // Create new post
                const newPost = await createBlogPost({
                    ...postData,
                    orgId,
                });
                if (!silent) {
                    toast({
                        title: 'Draft created',
                        description: 'Your post has been saved as a draft',
                    });
                }
                // Redirect to edit page
                router.push(`/dashboard/blog/${newPost.id}`);
            }
        } catch (error) {
            if (!silent) {
                toast({
                    title: 'Error saving draft',
                    description: error instanceof Error ? error.message : 'Failed to save post',
                    variant: 'destructive',
                });
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handlePublish = async () => {
        if (!post) {
            toast({
                title: 'Save first',
                description: 'Please save your post as a draft before publishing',
                variant: 'destructive',
            });
            return;
        }

        setIsPublishing(true);

        try {
            await publishBlogPost(post.id);
            toast({
                title: 'Post published',
                description: 'Your post is now live',
            });
            router.push('/dashboard/blog');
        } catch (error) {
            toast({
                title: 'Error publishing',
                description: error instanceof Error ? error.message : 'Failed to publish post',
                variant: 'destructive',
            });
        } finally {
            setIsPublishing(false);
        }
    };

    const handlePreview = () => {
        // TODO: Open preview in new window
        toast({
            title: 'Preview coming soon',
            description: 'Preview functionality will be available soon',
        });
    };

    const wordCount = content.split(/\s+/).filter(Boolean).length;
    const readingTime = Math.ceil(wordCount / 200); // ~200 words per minute

    return (
        <div className="h-screen flex flex-col">
            {/* Header */}
            <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex items-center justify-between px-6 py-3">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push('/dashboard/blog')}
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </Button>
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg font-semibold">
                                {post ? 'Edit Post' : 'New Post'}
                            </h1>
                            {post && (
                                <Badge variant="outline">
                                    {post.status.replace('_', ' ')}
                                </Badge>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                            {wordCount} words · {readingTime} min read
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handlePreview}
                        >
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSaveDraft()}
                            disabled={isSaving}
                        >
                            <Save className="h-4 w-4 mr-2" />
                            {isSaving ? 'Saving...' : 'Save Draft'}
                        </Button>
                        {post && post.status !== 'published' && (
                            <Button
                                size="sm"
                                onClick={handlePublish}
                                disabled={isPublishing}
                            >
                                <Send className="h-4 w-4 mr-2" />
                                {isPublishing ? 'Publishing...' : 'Publish'}
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Editor Layout */}
            <div className="flex-1 flex overflow-hidden">
                {/* Main Editor (70%) */}
                <div className="flex-1 overflow-y-auto">
                    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
                        {/* Title */}
                        <div>
                            <Input
                                placeholder="Post title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="text-4xl font-bold border-0 px-0 focus-visible:ring-0 placeholder:text-muted-foreground/50"
                            />
                        </div>

                        {/* Subtitle */}
                        <div>
                            <Input
                                placeholder="Subtitle (optional)"
                                value={subtitle}
                                onChange={(e) => setSubtitle(e.target.value)}
                                className="text-xl text-muted-foreground border-0 px-0 focus-visible:ring-0"
                            />
                        </div>

                        {/* Excerpt */}
                        <div>
                            <Label htmlFor="excerpt">Excerpt</Label>
                            <Textarea
                                id="excerpt"
                                placeholder="Brief summary (2-3 sentences)..."
                                value={excerpt}
                                onChange={(e) => setExcerpt(e.target.value)}
                                rows={3}
                                className="resize-none"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                {excerpt.length}/300 characters
                            </p>
                        </div>

                        {/* Featured Image */}
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-center border-2 border-dashed rounded-lg p-8">
                                    <div className="text-center">
                                        <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
                                        <p className="mt-2 text-sm font-medium">Featured Image</p>
                                        <p className="text-xs text-muted-foreground">Coming soon</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Content Editor */}
                        <div>
                            <Label htmlFor="content">Content</Label>
                            <Textarea
                                id="content"
                                placeholder="Write your post content in Markdown..."
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                rows={20}
                                className="font-mono text-sm resize-none"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Markdown supported
                            </p>
                        </div>
                    </div>
                </div>

                {/* Settings Sidebar (30%) */}
                <div className="w-[380px] border-l bg-muted/30 overflow-y-auto">
                    <div className="p-6 space-y-6">
                        <Accordion type="multiple" defaultValue={['seo', 'publishing']}>
                            {/* SEO Settings */}
                            <AccordionItem value="seo">
                                <AccordionTrigger>SEO Settings</AccordionTrigger>
                                <AccordionContent className="space-y-4">
                                    <div>
                                        <Label htmlFor="seo-title">SEO Title</Label>
                                        <Input
                                            id="seo-title"
                                            value={seoTitle}
                                            onChange={(e) => setSeoTitle(e.target.value)}
                                            placeholder="Title tag for search engines"
                                            maxLength={60}
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {seoTitle.length}/60 characters
                                        </p>
                                    </div>

                                    <div>
                                        <Label htmlFor="meta-description">Meta Description</Label>
                                        <Textarea
                                            id="meta-description"
                                            value={metaDescription}
                                            onChange={(e) => setMetaDescription(e.target.value)}
                                            placeholder="Description for search results"
                                            rows={3}
                                            maxLength={160}
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {metaDescription.length}/160 characters
                                        </p>
                                    </div>

                                    <div>
                                        <Label htmlFor="slug">URL Slug</Label>
                                        <Input
                                            id="slug"
                                            value={slug}
                                            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                                            placeholder="url-friendly-slug"
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="keywords">SEO Keywords</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                id="keywords"
                                                value={keywordInput}
                                                onChange={(e) => setKeywordInput(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddKeyword())}
                                                placeholder="Add keyword..."
                                            />
                                            <Button type="button" size="sm" onClick={handleAddKeyword}>
                                                Add
                                            </Button>
                                        </div>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {keywords.map((keyword) => (
                                                <Badge key={keyword} variant="secondary">
                                                    {keyword}
                                                    <button
                                                        onClick={() => handleRemoveKeyword(keyword)}
                                                        className="ml-1 hover:text-destructive"
                                                    >
                                                        ×
                                                    </button>
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>

                            {/* Publishing Settings */}
                            <AccordionItem value="publishing">
                                <AccordionTrigger>Publishing</AccordionTrigger>
                                <AccordionContent className="space-y-4">
                                    <div>
                                        <Label htmlFor="category">Category</Label>
                                        <Select value={category} onValueChange={(v) => setCategory(v as BlogCategory)}>
                                            <SelectTrigger id="category">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {CATEGORY_OPTIONS.map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <Label htmlFor="tags">Tags</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                id="tags"
                                                value={tagInput}
                                                onChange={(e) => setTagInput(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                                                placeholder="Add tag..."
                                            />
                                            <Button type="button" size="sm" onClick={handleAddTag}>
                                                Add
                                            </Button>
                                        </div>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {tags.map((tag) => (
                                                <Badge key={tag} variant="outline">
                                                    {tag}
                                                    <button
                                                        onClick={() => handleRemoveTag(tag)}
                                                        className="ml-1 hover:text-destructive"
                                                    >
                                                        ×
                                                    </button>
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>

                                    {post && (
                                        <div>
                                            <Label>Status</Label>
                                            <div className="flex items-center gap-2 mt-2">
                                                <Badge variant={post.status === 'published' ? 'default' : 'secondary'}>
                                                    {post.status.replace('_', ' ')}
                                                </Badge>
                                            </div>
                                        </div>
                                    )}
                                </AccordionContent>
                            </AccordionItem>

                            {/* Compliance (placeholder) */}
                            <AccordionItem value="compliance">
                                <AccordionTrigger>Compliance</AccordionTrigger>
                                <AccordionContent>
                                    <div className="text-center py-6">
                                        <CheckCircle className="mx-auto h-8 w-8 text-green-500 mb-2" />
                                        <p className="text-sm font-medium">Ready for review</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Compliance checking coming soon
                                        </p>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </div>
                </div>
            </div>
        </div>
    );
}
