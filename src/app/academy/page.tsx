'use client';

/**
 * Cannabis Marketing AI Academy - Public Landing Page
 *
 * Lead magnet page allowing anyone to learn cannabis + AI marketing.
 * No authentication required - captures email when user hits 3-video limit.
 *
 * Features:
 * - 12 episodes across 7 agent tracks
 * - Progressive email gating (3 free views)
 * - Downloadable resources
 * - Social equity program callout
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  GraduationCap,
  Sparkles,
  Play,
  BookOpen,
  ArrowRight,
  Filter,
  X,
  Download,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

// Components
import { EmailGateModal } from '@/components/academy/email-gate-modal';
import { TrackCard } from '@/components/academy/track-card';
import { EpisodeCard } from '@/components/academy/episode-card';
import { YouTubeEmbed } from '@/components/academy/youtube-embed';
import { ResourceLibrary } from '@/components/academy/resource-library';
import { SocialEquityCallout } from '@/components/academy/social-equity-callout';

// Data & Utilities
import {
  ACADEMY_EPISODES,
  AGENT_TRACKS,
  ACADEMY_PROGRAM,
  getEpisodesByTrack,
  getAllResources,
} from '@/lib/academy/curriculum';
import {
  canViewContent,
  recordContentView,
  recordEmailCapture,
  getRemainingViews,
  hasProvidedEmail,
  getWatchedVideoIds,
  getDownloadedResourceIds,
  getLeadId,
} from '@/lib/academy/usage-tracker';
import { getResourceDownloadUrl } from '@/server/actions/academy-resources';
import { trackResourceDownload, trackDemoInterest } from '@/server/actions/academy';
import type { AcademyEpisode, AgentTrack, AcademyResource } from '@/types/academy';

export default function AcademyPage() {
  // Usage tracking state
  const [remaining, setRemaining] = useState(3);
  const [hasEmail, setHasEmail] = useState(false);
  const [watchedIds, setWatchedIds] = useState<string[]>([]);
  const [downloadedIds, setDownloadedIds] = useState<string[]>([]);

  // Content state
  const [selectedTrack, setSelectedTrack] = useState<AgentTrack | 'all'>('all');
  const [selectedEpisode, setSelectedEpisode] = useState<AcademyEpisode | null>(
    null
  );
  const [activeTab, setActiveTab] = useState<'episodes' | 'resources'>('episodes');

  // Email gate state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailModalReason, setEmailModalReason] = useState<
    'limit_reached' | 'resource_download'
  >('limit_reached');
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Deep linking support
  const searchParams = useSearchParams();

  const { toast } = useToast();

  // Initialize usage tracking
  useEffect(() => {
    setRemaining(getRemainingViews());
    setHasEmail(hasProvidedEmail());
    setWatchedIds(getWatchedVideoIds());
    setDownloadedIds(getDownloadedResourceIds());
  }, []);

  // Deep linking: Handle URL query params
  useEffect(() => {
    // ?track=smokey - Filter by track
    const trackParam = searchParams.get('track') as AgentTrack | null;
    if (trackParam && trackParam in AGENT_TRACKS) {
      setSelectedTrack(trackParam);
      setActiveTab('episodes');
    }

    // ?episode=ep1-intro - Open specific episode
    const episodeParam = searchParams.get('episode');
    if (episodeParam) {
      const episode = ACADEMY_EPISODES.find((ep) => ep.id === episodeParam);
      if (episode) {
        handleWatchEpisode(episode);
      }
    }

    // ?resource=checklist-1 - Prompt resource download
    const resourceParam = searchParams.get('resource');
    if (resourceParam) {
      const resource = getAllResources().find((r) => r.id === resourceParam);
      if (resource) {
        setActiveTab('resources');
        // Small delay to ensure resources tab is visible
        setTimeout(() => handleDownloadResource(resource), 100);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const updateUsageState = () => {
    setRemaining(getRemainingViews());
    setHasEmail(hasProvidedEmail());
    setWatchedIds(getWatchedVideoIds());
    setDownloadedIds(getDownloadedResourceIds());
  };

  // Handle episode watch
  const handleWatchEpisode = (episode: AcademyEpisode) => {
    // Check if user can view
    const check = canViewContent('video');

    if (!check.allowed) {
      // Show email gate
      setEmailModalReason('limit_reached');
      setShowEmailModal(true);
      setPendingAction(() => () => handleWatchEpisode(episode));
      return;
    }

    // Record view
    recordContentView({
      id: episode.id,
      title: episode.title,
      type: 'video',
    });

    // Open episode
    setSelectedEpisode(episode);
    updateUsageState();

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle resource download
  const handleDownloadResource = async (resource: AcademyResource) => {
    // Check if user has email
    if (resource.requiresEmail && !hasEmail) {
      setEmailModalReason('resource_download');
      setShowEmailModal(true);
      setPendingAction(() => () => handleDownloadResource(resource));
      return;
    }

    try {
      // Show loading toast
      const loadingToast = toast({
        title: 'Preparing Download...',
        description: `Getting ${resource.title}`,
      });

      // Get signed download URL from server
      const leadId = getLeadId();
      const result = await getResourceDownloadUrl({
        resourceId: resource.id,
        leadId,
      });

      if (!result.success || !result.downloadUrl) {
        toast({
          title: 'Download Failed',
          description: result.error || 'Unable to download resource. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      // Record download in localStorage
      recordContentView({
        id: resource.id,
        title: resource.title,
        type: 'resource',
      });

      // Track download in Firestore (if lead exists)
      if (leadId) {
        await trackResourceDownload({
          resourceId: resource.id,
          leadId,
        });
      }

      // Trigger browser download
      const link = document.createElement('a');
      link.href = result.downloadUrl;
      link.download = result.fileName || `${resource.title}.${resource.fileType.toLowerCase()}`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Update state
      updateUsageState();

      // Show success toast
      toast({
        title: 'Download Started!',
        description: `${resource.title} is downloading now.`,
      });
    } catch (error) {
      console.error('Error downloading resource:', error);
      toast({
        title: 'Download Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Handle email gate success
  const handleEmailSuccess = (leadId: string) => {
    // Record email capture in localStorage
    recordEmailCapture('pending@email.com', leadId);
    updateUsageState();

    setShowEmailModal(false);
    toast({
      title: 'Welcome to the Academy!',
      description: 'You now have unlimited access to all content.',
    });

    // Execute pending action
    if (pendingAction) {
      const action = pendingAction;
      setPendingAction(null);
      action();
    }
  };

  // Handle track selection
  const handleTrackSelect = (track: AgentTrack) => {
    if (selectedTrack === track) {
      setSelectedTrack('all');
    } else {
      setSelectedTrack(track);
    }
    setActiveTab('episodes');
  };

  // Handle demo booking click
  const handleDemoClick = async () => {
    const leadId = getLeadId();

    // Track demo interest (adds intent signal)
    if (leadId) {
      await trackDemoInterest({ leadId });
    }

    // Open demo booking page
    const demoUrl = 'https://bakedbot.ai/demo?source=academy';
    window.open(demoUrl, '_blank');

    // Show encouragement toast
    toast({
      title: 'Opening Demo Booking...',
      description: "We're excited to show you BakedBot in action! 🚀",
    });
  };

  // Get filtered episodes
  const filteredEpisodes =
    selectedTrack === 'all'
      ? ACADEMY_EPISODES
      : ACADEMY_EPISODES.filter((ep) => ep.track === selectedTrack);

  // Get all resources
  const allResources = getAllResources();

  // Get related episodes (for video player)
  const getRelatedEpisodes = (currentEpisode: AcademyEpisode) => {
    const currentIndex = ACADEMY_EPISODES.findIndex(
      (ep) => ep.id === currentEpisode.id
    );
    return ACADEMY_EPISODES.slice(currentIndex + 1, currentIndex + 4);
  };

  // If viewing an episode, show video player
  if (selectedEpisode) {
    return (
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => setSelectedEpisode(null)}
          className="mb-6 gap-2"
        >
          <ArrowRight className="h-4 w-4 rotate-180" />
          Back to Episodes
        </Button>

        {/* Video Player */}
        <YouTubeEmbed
          episode={selectedEpisode}
          relatedEpisodes={getRelatedEpisodes(selectedEpisode)}
          onRelatedClick={handleWatchEpisode}
          onResourceClick={(resourceId) => {
            const resource = selectedEpisode.resources.find(
              (r) => r.id === resourceId
            );
            if (resource) {
              handleDownloadResource(resource);
            }
          }}
        />
      </div>
    );
  }

  // Main landing page view
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4">
              <Sparkles className="h-3 w-3 mr-1" />
              Free Cannabis Marketing Education
            </Badge>

            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Cannabis Marketing AI Academy
            </h1>

            <p className="text-xl text-muted-foreground mb-8">
              Master AI-powered cannabis marketing in 12 episodes. Learn from the 7
              BakedBot agents and become the category expert your customers need.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button size="lg" className="gap-2" onClick={() => setActiveTab('episodes')}>
                <Play className="h-5 w-5" />
                Start Learning Free
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="gap-2"
                onClick={handleDemoClick}
              >
                <GraduationCap className="h-5 w-5" />
                Book a Demo
              </Button>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-8 text-sm">
              <div>
                <div className="text-2xl font-bold text-primary">
                  {ACADEMY_PROGRAM.totalEpisodes}
                </div>
                <div className="text-muted-foreground">Episodes</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">
                  {Math.ceil(ACADEMY_PROGRAM.totalDuration / 3600)}h+
                </div>
                <div className="text-muted-foreground">Content</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">
                  {allResources.length}
                </div>
                <div className="text-muted-foreground">Resources</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">7</div>
                <div className="text-muted-foreground">Agent Tracks</div>
              </div>
            </div>

            {/* Usage Counter */}
            {!hasEmail && (
              <div className="mt-6">
                <Badge variant="outline">
                  {remaining} free {remaining === 1 ? 'video' : 'videos'} remaining
                </Badge>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="container mx-auto px-4 py-12">
        {/* Agent Tracks */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-3">Choose Your Learning Track</h2>
            <p className="text-muted-foreground">
              Master one agent at a time, or explore all 7 tracks
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {(Object.keys(AGENT_TRACKS) as AgentTrack[]).map((track) => {
              const trackInfo = AGENT_TRACKS[track];
              const episodeCount = getEpisodesByTrack(track).length;

              return (
                <TrackCard
                  key={track}
                  track={track}
                  trackInfo={trackInfo}
                  episodeCount={episodeCount}
                  onSelect={handleTrackSelect}
                  isSelected={selectedTrack === track}
                />
              );
            })}
          </div>

          {/* Clear Filter */}
          {selectedTrack !== 'all' && (
            <div className="flex justify-center mt-6">
              <Button
                variant="outline"
                onClick={() => setSelectedTrack('all')}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Clear Filter
              </Button>
            </div>
          )}
        </div>

        {/* Tabs: Episodes vs Resources */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="episodes" className="gap-2">
              <Play className="h-4 w-4" />
              Episodes ({filteredEpisodes.length})
            </TabsTrigger>
            <TabsTrigger value="resources" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Resources ({allResources.length})
            </TabsTrigger>
          </TabsList>

          {/* Episodes Tab */}
          <TabsContent value="episodes" className="mt-8">
            {selectedTrack !== 'all' && (
              <div className="mb-6 p-4 bg-muted rounded-lg flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span className="text-sm">
                  Showing {filteredEpisodes.length} episodes from{' '}
                  <strong>{AGENT_TRACKS[selectedTrack as AgentTrack].name}</strong>
                </span>
              </div>
            )}

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEpisodes.map((episode) => (
                <EpisodeCard
                  key={episode.id}
                  episode={episode}
                  onWatch={handleWatchEpisode}
                  isLocked={episode.requiresEmail && !hasEmail}
                  hasWatched={watchedIds.includes(episode.id)}
                />
              ))}
            </div>
          </TabsContent>

          {/* Resources Tab */}
          <TabsContent value="resources" className="mt-8">
            <ResourceLibrary
              resources={allResources}
              onDownload={handleDownloadResource}
              hasEmail={hasEmail}
              downloadedIds={downloadedIds}
            />
          </TabsContent>
        </Tabs>
      </section>

      {/* Social Equity Callout */}
      <section className="container mx-auto px-4 py-12">
        <SocialEquityCallout />
      </section>

      {/* Email Gate Modal */}
      <EmailGateModal
        open={showEmailModal}
        onOpenChange={setShowEmailModal}
        reason={emailModalReason}
        onSuccess={handleEmailSuccess}
        remainingViews={remaining}
      />
    </div>
  );
}
