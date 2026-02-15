/**
 * Client library for bakedbot-magnets Admin API
 *
 * This library provides type-safe methods to interact with the lead magnets
 * admin API (Academy, Vibe, Training) hosted on bakedbot-magnets app.
 */

import { getAuth } from 'firebase/auth';

const MAGNETS_API_URL = process.env.NEXT_PUBLIC_MAGNETS_API_URL ||
  'https://bakedbot-magnets--studio-567050101-bc6e8.us-central1.hosted.app';

// Types
export interface AcademyLead {
  id: string;
  email: string;
  videosWatched: number;
  createdAt: string;
  lastViewedAt: string;
  intentSignals?: string[];
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export interface VibeLead {
  id: string;
  email: string;
  vibeType: 'web' | 'mobile';
  vibesGenerated: number;
  createdAt: string;
  intentSignals?: string[];
}

export interface AcademyAnalytics {
  totalViews: number;
  totalLeads: number;
  uniqueViewers: number;
  completedEpisodes: number;
  episodeAnalytics: Record<string, {
    views: number;
    completions: number;
    avgWatchTime: number;
  }>;
  conversionMetrics: {
    totalViewers: number;
    totalLeads: number;
    conversionRate: number;
    highQualityLeads: number;
    highQualityRate: number;
  };
  timeRange: string;
}

export interface OverviewStats {
  academy: {
    totalLeads: number;
    totalViews: number;
    recentLeads: number;
  };
  vibe: {
    totalLeads: number;
    totalWebVibes: number;
    totalMobileVibes: number;
    recentLeads: number;
  };
  training: {
    totalUsers: number;
    recentUsers: number;
  };
  lastUpdated: string;
}

export class MagnetsAPI {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || MAGNETS_API_URL;
  }

  /**
   * Get Firebase ID token for authenticated requests
   */
  private async getAuthToken(): Promise<string> {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      throw new Error('Not authenticated. Please sign in first.');
    }

    try {
      const token = await user.getIdToken();
      return token;
    } catch (error) {
      console.error('Failed to get auth token:', error);
      throw new Error('Failed to authenticate. Please sign in again.');
    }
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const token = await this.getAuthToken();

    const response = await fetch(`${this.baseUrl}/api/admin${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  // ===== Overview =====

  /**
   * Get overview statistics for all lead magnets
   */
  async getOverview(): Promise<OverviewStats> {
    return this.request<OverviewStats>('/overview');
  }

  // ===== Academy =====

  /**
   * Fetch academy leads with pagination
   */
  async getAcademyLeads(params?: {
    limit?: number;
    offset?: number;
    sortBy?: string;
    order?: 'asc' | 'desc';
  }): Promise<{
    leads: AcademyLead[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.offset) queryParams.set('offset', params.offset.toString());
    if (params?.sortBy) queryParams.set('sortBy', params.sortBy);
    if (params?.order) queryParams.set('order', params.order);

    const query = queryParams.toString();
    return this.request(`/academy/leads${query ? `?${query}` : ''}`);
  }

  /**
   * Delete an academy lead
   */
  async deleteAcademyLead(leadId: string): Promise<{ success: boolean }> {
    return this.request(`/academy/leads?id=${leadId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get academy analytics and metrics
   */
  async getAcademyAnalytics(
    range: '7d' | '30d' | '90d' | 'all' = '30d'
  ): Promise<AcademyAnalytics> {
    return this.request(`/academy/analytics?range=${range}`);
  }

  // ===== Vibe =====

  /**
   * Fetch vibe studio leads
   */
  async getVibeLeads(params?: {
    limit?: number;
    offset?: number;
    type?: 'web' | 'mobile';
  }): Promise<{
    leads: VibeLead[];
    total: number;
    limit: number;
    offset: number;
    stats: {
      totalWebVibes: number;
      totalMobileVibes: number;
      totalVibes: number;
      totalLeads: number;
      conversionRate: number;
    };
  }> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.offset) queryParams.set('offset', params.offset.toString());
    if (params?.type) queryParams.set('type', params.type);

    const query = queryParams.toString();
    return this.request(`/vibe/leads${query ? `?${query}` : ''}`);
  }

  /**
   * Get vibe gallery (recently generated vibes)
   */
  async getVibeGallery(params?: {
    type?: 'web' | 'mobile';
    limit?: number;
  }): Promise<{ vibes: any[] }> {
    return this.request('/vibe/gallery', {
      method: 'POST',
      body: JSON.stringify({
        type: params?.type || 'web',
        limit: params?.limit || 50,
      }),
    });
  }
}

// Export singleton instance
export const magnetsAPI = new MagnetsAPI();

// Export class for custom instances
export default MagnetsAPI;
