import type { BlogCategory, BlogContentType } from './blog';

export interface ContentAnalyticsKpis {
    sessions28d: number | null;
    blogSessions28d: number | null;
    impressions28d: number | null;
    clicks28d: number | null;
    ctr28d: number | null;
    avgPosition28d: number | null;
    comparisonPosts: number;
    aiqMentionPosts: number;
}

export interface ContentAnalyticsTopSource {
    source: string;
    sessions: number;
}

export interface ContentAnalyticsTopPage {
    path: string;
    sessions: number;
}

export interface ContentAnalyticsTopQuery {
    query: string;
    clicks: number;
    impressions: number;
    position: number;
}

export interface ContentAnalyticsRecommendation {
    title: string;
    topic: string;
    reason: string;
    source: 'search_console' | 'google_analytics' | 'competitive_intel';
    contentType: BlogContentType;
    category: BlogCategory;
    supportingMetric: string;
}

export interface ContentAnalyticsSnapshot {
    generatedAt: string;
    gaConnected: boolean;
    gscConnected: boolean;
    gaMode: 'oauth' | 'service_account' | 'disconnected';
    gscMode: 'oauth' | 'service_account' | 'disconnected';
    primaryCompetitor: string;
    competitorDifferentiators: string[];
    kpis: ContentAnalyticsKpis;
    topSources: ContentAnalyticsTopSource[];
    topContentPages: ContentAnalyticsTopPage[];
    topQueries: ContentAnalyticsTopQuery[];
    recommendations: ContentAnalyticsRecommendation[];
}

export interface NewsIdea {
    title: string;
    url: string;
    snippet: string;
    suggestedAngle: string;
    publishedDate?: string;
}

export interface Citation {
    quote: string;
    author: string;
    company: string;
    url: string;
    sourceTitle: string;
}

export interface ResearchBrief {
    topic: string;
    keyFindings: string[];
    suggestedAngles: string[];
    competitorGaps: string[];
    suggestedTitle: string;
    suggestedKeywords: string[];
    rawResearch: string;
    citations: Citation[];
    analyticsSignals?: ContentAnalyticsSnapshot | null;
}

export interface ContentScorecard {
    hubCount: number;
    spokeCount: number;
    programmaticCount: number;
    comparisonCount: number;
    reportCount: number;
    standardCount: number;
    totalPublished: number;
    hubTarget: number;
    spokeTarget: number;
    programmaticTarget: number;
}

export interface NewsIdeasResult {
    ideas: NewsIdea[];
    cachedAt: string | null;
}
