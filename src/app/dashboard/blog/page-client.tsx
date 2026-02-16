'use client';

/**
 * Blog Dashboard Client Component
 *
 * Interactive blog management interface with filtering, sorting, bulk actions
 */

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BlogPost, BlogStatus, BlogCategory } from '@/types/blog';
import { AIGeneratorDialog, type BlogGeneratorInput } from '@/components/blog/ai-generator-dialog';
import { generateBlogDraft } from '@/server/actions/blog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    FileText,
    Plus,
    Sparkles,
    Search,
    MoreVertical,
    Eye,
    Edit,
    Trash2,
    Calendar,
    TrendingUp,
} from 'lucide-react';
import { format } from 'date-fns';

interface BlogDashboardClientProps {
    orgId: string;
    userId: string;
    initialPosts: BlogPost[];
    userRole: string;
}

const STATUS_COLORS: Record<BlogStatus, string> = {
    draft: 'secondary',
    pending_review: 'warning',
    approved: 'success',
    scheduled: 'info',
    published: 'default',
    archived: 'outline',
};

const CATEGORY_LABELS: Record<BlogCategory, string> = {
    education: 'Education',
    product_spotlight: 'Product Spotlight',
    industry_news: 'Industry News',
    company_update: 'Company Update',
    strain_profile: 'Strain Profile',
    compliance: 'Compliance',
    cannabis_culture: 'Cannabis Culture',
    wellness: 'Wellness',
};

export function BlogDashboardClient({
    orgId,
    userId,
    initialPosts,
    userRole,
}: BlogDashboardClientProps) {
    const router = useRouter();
    const [posts] = useState<BlogPost[]>(initialPosts);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [activeTab, setActiveTab] = useState<string>('all');
    const [showAIDialog, setShowAIDialog] = useState(false);

    // Filter posts based on search, status, category, and tab
    const filteredPosts = useMemo(() => {
        let filtered = posts;

        // Tab filtering
        if (activeTab !== 'all') {
            filtered = filtered.filter(post => {
                if (activeTab === 'drafts') return post.status === 'draft';
                if (activeTab === 'scheduled') return post.status === 'scheduled';
                if (activeTab === 'published') return post.status === 'published';
                return true;
            });
        }

        // Search filtering
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
                post =>
                    post.title.toLowerCase().includes(query) ||
                    post.excerpt.toLowerCase().includes(query) ||
                    post.author.name.toLowerCase().includes(query)
            );
        }

        // Status filtering
        if (selectedStatus !== 'all') {
            filtered = filtered.filter(post => post.status === selectedStatus);
        }

        // Category filtering
        if (selectedCategory !== 'all') {
            filtered = filtered.filter(post => post.category === selectedCategory);
        }

        return filtered;
    }, [posts, searchQuery, selectedStatus, selectedCategory, activeTab]);

    // Calculate stats
    const stats = useMemo(() => {
        const totalPosts = posts.length;
        const drafts = posts.filter(p => p.status === 'draft').length;
        const published = posts.filter(p => p.status === 'published').length;
        const totalViews = posts.reduce((sum, p) => sum + p.viewCount, 0);

        return { totalPosts, drafts, published, totalViews };
    }, [posts]);

    const handleCreateNew = () => {
        router.push('/dashboard/blog/new');
    };

    const handleGenerateAI = () => {
        setShowAIDialog(true);
    };

    const handleGenerate = async (input: BlogGeneratorInput) => {
        const result = await generateBlogDraft({ ...input, userId });
        // Navigate to the new post editor with the generated content
        router.push(`/dashboard/blog/${result.id}`);
    };

    const handleEditPost = (postId: string) => {
        router.push(`/dashboard/blog/${postId}`);
    };

    const handleViewPost = (post: BlogPost) => {
        // TODO: Get brand slug from org
        // For now, just log
        console.log('View post:', post.slug);
    };

    const handleDeletePost = async (postId: string) => {
        if (!confirm('Are you sure you want to delete this post?')) return;
        // TODO: Implement delete
        console.log('Delete post:', postId);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Blog Posts</h1>
                    <p className="text-muted-foreground">
                        Create and manage blog content for your audience
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={handleGenerateAI}>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate with AI
                    </Button>
                    <Button onClick={handleCreateNew}>
                        <Plus className="mr-2 h-4 w-4" />
                        New Post
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalPosts}</div>
                        <p className="text-xs text-muted-foreground">
                            All blog posts
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Drafts</CardTitle>
                        <Edit className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.drafts}</div>
                        <p className="text-xs text-muted-foreground">
                            Unpublished posts
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Published</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.published}</div>
                        <p className="text-xs text-muted-foreground">
                            Live on site
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Views</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalViews.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            All-time views
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters and Tabs */}
            <Card>
                <CardHeader>
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex-1 flex gap-3">
                            {/* Search */}
                            <div className="relative flex-1 max-w-sm">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search posts..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9"
                                />
                            </div>

                            {/* Status Filter */}
                            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="All statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="draft">Draft</SelectItem>
                                    <SelectItem value="pending_review">Pending Review</SelectItem>
                                    <SelectItem value="approved">Approved</SelectItem>
                                    <SelectItem value="scheduled">Scheduled</SelectItem>
                                    <SelectItem value="published">Published</SelectItem>
                                    <SelectItem value="archived">Archived</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Category Filter */}
                            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="All categories" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                                        <SelectItem key={value} value={value}>
                                            {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>

                <CardContent>
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList>
                            <TabsTrigger value="all">
                                All ({posts.length})
                            </TabsTrigger>
                            <TabsTrigger value="drafts">
                                Drafts ({posts.filter(p => p.status === 'draft').length})
                            </TabsTrigger>
                            <TabsTrigger value="scheduled">
                                Scheduled ({posts.filter(p => p.status === 'scheduled').length})
                            </TabsTrigger>
                            <TabsTrigger value="published">
                                Published ({posts.filter(p => p.status === 'published').length})
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value={activeTab} className="mt-6">
                            {filteredPosts.length === 0 ? (
                                <div className="text-center py-12">
                                    <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
                                    <h3 className="mt-4 text-lg font-semibold">No posts found</h3>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        {searchQuery || selectedStatus !== 'all' || selectedCategory !== 'all'
                                            ? 'Try adjusting your filters'
                                            : 'Get started by creating your first blog post'}
                                    </p>
                                    {!searchQuery && selectedStatus === 'all' && selectedCategory === 'all' && (
                                        <Button onClick={handleCreateNew}>
                                            <Plus className="mr-2 h-4 w-4" />
                                            Create Post
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Title</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Category</TableHead>
                                                <TableHead>Author</TableHead>
                                                <TableHead className="text-right">Views</TableHead>
                                                <TableHead>Date</TableHead>
                                                <TableHead className="w-[70px]"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredPosts.map((post) => (
                                                <TableRow key={post.id}>
                                                    <TableCell>
                                                        <div className="max-w-md">
                                                            <button
                                                                onClick={() => handleEditPost(post.id)}
                                                                className="font-medium hover:underline text-left"
                                                            >
                                                                {post.title}
                                                            </button>
                                                            <p className="text-sm text-muted-foreground line-clamp-1">
                                                                {post.excerpt}
                                                            </p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={STATUS_COLORS[post.status] as any}>
                                                            {post.status.replace('_', ' ')}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="text-sm">
                                                            {CATEGORY_LABELS[post.category]}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            {post.author.avatar && (
                                                                <img
                                                                    src={post.author.avatar}
                                                                    alt={post.author.name}
                                                                    className="h-6 w-6 rounded-full"
                                                                />
                                                            )}
                                                            <span className="text-sm">{post.author.name}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <span className="text-sm">
                                                            {post.viewCount.toLocaleString()}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="text-sm text-muted-foreground">
                                                            {post.publishedAt
                                                                ? format(post.publishedAt.toDate(), 'MMM d, yyyy')
                                                                : format(post.updatedAt.toDate(), 'MMM d, yyyy')}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="sm">
                                                                    <MoreVertical className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onClick={() => handleEditPost(post.id)}>
                                                                    <Edit className="mr-2 h-4 w-4" />
                                                                    Edit
                                                                </DropdownMenuItem>
                                                                {post.status === 'published' && (
                                                                    <DropdownMenuItem onClick={() => handleViewPost(post)}>
                                                                        <Eye className="mr-2 h-4 w-4" />
                                                                        View
                                                                    </DropdownMenuItem>
                                                                )}
                                                                <DropdownMenuItem
                                                                    onClick={() => handleDeletePost(post.id)}
                                                                    className="text-destructive"
                                                                >
                                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                                    Delete
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            {/* AI Generator Dialog */}
            <AIGeneratorDialog
                open={showAIDialog}
                onOpenChange={setShowAIDialog}
                onGenerate={handleGenerate}
                orgId={orgId}
            />
        </div>
    );
}
