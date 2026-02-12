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
 * - Framer Motion animations throughout
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Play,
  BookOpen,
  ArrowRight,
  Filter,
  X,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Components
import { HeroSection } from '@/components/academy/hero-section';
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

const sectionVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function AcademyPage() {
  // Usage tracking state
  const [remaining, setRemaining] = useState(3);
  const [hasEmail, setHasEmail] = useState(false);
  const [watchedIds, setWatchedIds] = useState<string[]>([]);
  const [downloadedIds, setDownloadedIds] = useState<string[]>([]);

  // Content state
  const [selectedTrack, setSelectedTrack] = useState<AgentTrack | 'all'>('all');
  const [selectedEpisode, setSelectedEpisode] = useState<AcademyEpisode | null>(null);
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
    const trackParam = searchParams.get('track') as AgentTrack | null;
    if (trackParam && trackParam in AGENT_TRACKS) {
      setSelectedTrack(trackParam);
      setActiveTab('episodes');
    }

    const episodeParam = searchParams.get('episode');
    if (episodeParam) {
      const episode = ACADEMY_EPISODES.find((ep) => ep.id === episodeParam);
      if (episode) {
        handleWatchEpisode(episode);
      }
    }

    const resourceParam = searchParams.get('resource');
    if (resourceParam) {
      const resource = getAllResources().find((r) => r.id === resourceParam);
      if (resource) {
        setActiveTab('resources');
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

  const handleWatchEpisode = (episode: AcademyEpisode) => {
    const check = canViewContent('video');

    if (!check.allowed) {
      setEmailModalReason('limit_reached');
      setShowEmailModal(true);
      setPendingAction(() => () => handleWatchEpisode(episode));
      return;
    }

    recordContentView({ id: episode.id, title: episode.title, type: 'video' });
    setSelectedEpisode(episode);
    updateUsageState();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDownloadResource = async (resource: AcademyResource) => {
    if (resource.requiresEmail && !hasEmail) {
      setEmailModalReason('resource_download');
      setShowEmailModal(true);
      setPendingAction(() => () => handleDownloadResource(resource));
      return;
    }

    try {
      toast({ title: 'Preparing Download...', description: `Getting ${resource.title}` });

      const leadId = getLeadId();
      const result = await getResourceDownloadUrl({ resourceId: resource.id, leadId });

      if (!result.success || !result.downloadUrl) {
        toast({
          title: 'Download Failed',
          description: result.error || 'Unable to download resource. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      recordContentView({ id: resource.id, title: resource.title, type: 'resource' });

      if (leadId) {
        await trackResourceDownload({ resourceId: resource.id, leadId });
      }

      const link = document.createElement('a');
      link.href = result.downloadUrl;
      link.download = result.fileName || `${resource.title}.${resource.fileType.toLowerCase()}`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      updateUsageState();
      toast({ title: 'Download Started!', description: `${resource.title} is downloading now.` });
    } catch (error) {
      console.error('Error downloading resource:', error);
      toast({
        title: 'Download Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleEmailSuccess = (leadId: string) => {
    recordEmailCapture('pending@email.com', leadId);
    updateUsageState();
    setShowEmailModal(false);
    toast({ title: 'Welcome to the Academy!', description: 'You now have unlimited access to all content.' });

    if (pendingAction) {
      const action = pendingAction;
      setPendingAction(null);
      action();
    }
  };

  const handleTrackSelect = (track: AgentTrack) => {
    if (selectedTrack === track) {
      setSelectedTrack('all');
    } else {
      setSelectedTrack(track);
    }
    setActiveTab('episodes');
    setTimeout(() => {
      document.getElementById('academy-content')?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const handleStartLearning = () => {
    setActiveTab('episodes');
    document.getElementById('academy-content')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDemoClick = async () => {
    const leadId = getLeadId();
    if (leadId) {
      await trackDemoInterest({ leadId });
    }
    window.open('https://bakedbot.ai/demo?source=academy', '_blank');
    toast({ title: 'Opening Demo Booking...', description: "We're excited to show you BakedBot in action!" });
  };

  // Derived data
  const filteredEpisodes =
    selectedTrack === 'all'
      ? ACADEMY_EPISODES
      : ACADEMY_EPISODES.filter((ep) => ep.track === selectedTrack);
  const allResources = getAllResources();

  const getRelatedEpisodes = (currentEpisode: AcademyEpisode) => {
    const currentIndex = ACADEMY_EPISODES.findIndex((ep) => ep.id === currentEpisode.id);
    return ACADEMY_EPISODES.slice(currentIndex + 1, currentIndex + 4);
  };

  // ─── Video Player View ───────────────────────────────────
  if (selectedEpisode) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => setSelectedEpisode(null)}
          className="mb-6 gap-2"
        >
          <ArrowRight className="h-4 w-4 rotate-180" />
          Back to Episodes
        </Button>

        <YouTubeEmbed
          episode={selectedEpisode}
          relatedEpisodes={getRelatedEpisodes(selectedEpisode)}
          onRelatedClick={handleWatchEpisode}
          onResourceClick={(resourceId) => {
            const resource = selectedEpisode.resources.find((r) => r.id === resourceId);
            if (resource) handleDownloadResource(resource);
          }}
        />
      </div>
    );
  }

  // ─── Main Landing Page ───────────────────────────────────
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <HeroSection
        totalResources={allResources.length}
        remaining={remaining}
        hasEmail={hasEmail}
        onStartLearning={handleStartLearning}
        onBookDemo={handleDemoClick}
      />

      {/* Main Content */}
      <section id="academy-content" className="container mx-auto px-4 py-16">
        {/* Agent Tracks */}
        <motion.div
          className="mb-14"
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-3">Choose Your Learning Track</h2>
            <p className="text-muted-foreground">
              Master one agent at a time, or explore all 7 tracks
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
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
        </motion.div>

        {/* Tabs: Episodes vs Resources */}
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'episodes' | 'resources')}>
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
        </motion.div>
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
