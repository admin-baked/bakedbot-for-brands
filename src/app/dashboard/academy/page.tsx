'use client';

/**
 * Protected Academy Dashboard
 *
 * Shows logged-in users their progress through the Academy curriculum.
 * Features: progress tracking, achievements, certificates, saved resources
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Award,
  Download,
  Video,
  BookOpen,
  TrendingUp,
  CheckCircle,
  Clock,
  ArrowRight,
  Play,
  Presentation,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import {
  getAcademyProgress,
  getProgressCompletion,
  type AcademyProgress,
} from '@/server/actions/academy-progress';
import { generateCertificate } from '@/server/actions/academy-certificates';
import { ACADEMY_EPISODES, AGENT_TRACKS, getAllResources } from '@/lib/academy/curriculum';
import type { AgentTrack } from '@/types/academy';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

export default function AcademyDashboardPage() {
  const { user } = useAuth();
  const [progress, setProgress] = useState<AcademyProgress | null>(null);
  const [completion, setCompletion] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Handle certificate download
  const handleDownloadCertificate = async (trackId?: AgentTrack) => {
    try {
      toast({
        title: 'Generating Certificate...',
        description: 'Creating your certificate. This may take a moment.',
      });

      const result = await generateCertificate({ trackId });

      if (!result.success || !result.certificateUrl) {
        toast({
          title: 'Generation Failed',
          description: result.error || 'Unable to generate certificate.',
          variant: 'destructive',
        });
        return;
      }

      // Open certificate in new window for printing/downloading
      window.open(result.certificateUrl, '_blank');

      toast({
        title: 'Certificate Ready!',
        description: 'Your certificate is ready. Use your browser to print or save as PDF.',
      });
    } catch (error) {
      console.error('Error generating certificate:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate certificate. Please try again.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (!user) return;

    async function fetchProgress() {
      setLoading(true);
      try {
        const [progressResult, completionResult] = await Promise.all([
          getAcademyProgress(),
          getProgressCompletion(),
        ]);

        if (progressResult.success && progressResult.progress) {
          setProgress(progressResult.progress);
        }

        if (completionResult.success && completionResult.completion) {
          setCompletion(completionResult.completion);
        }
      } catch (error) {
        console.error('Failed to fetch progress:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProgress();
  }, [user]);

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-2">Please Log In</h2>
            <p className="text-muted-foreground mb-4">
              Sign in to track your Academy progress and earn certificates.
            </p>
            <Button asChild>
              <Link href="/login">Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading your progress...</div>
      </div>
    );
  }

  // Get next episode to watch
  const nextEpisode = progress?.currentEpisode
    ? ACADEMY_EPISODES.find((ep) => ep.id === progress.currentEpisode) ||
      ACADEMY_EPISODES[0]
    : ACADEMY_EPISODES[0];

  // Get track progress
  const trackProgress = (Object.keys(AGENT_TRACKS) as AgentTrack[]).map((track) => {
    const trackEpisodes = ACADEMY_EPISODES.filter((ep) => ep.track === track);
    const watchedInTrack = trackEpisodes.filter((ep) =>
      progress?.videosWatched.includes(ep.id)
    ).length;
    const isCompleted = progress?.completedTracks.includes(track) || false;

    return {
      track,
      trackInfo: AGENT_TRACKS[track],
      total: trackEpisodes.length,
      watched: watchedInTrack,
      completed: isCompleted,
      percentage: trackEpisodes.length > 0 ? (watchedInTrack / trackEpisodes.length) * 100 : 0,
    };
  });

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Academy Progress</h1>
          <p className="text-muted-foreground">
            Track your learning journey through the Cannabis Marketing AI Academy
          </p>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link href="/dashboard/academy/presenter">
            <Presentation className="h-4 w-4" />
            Presenter Mode
          </Link>
        </Button>
      </div>

      {/* Overall Progress */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Overall Completion
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Main Progress Bar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl font-bold">
                  {completion?.overallPercentage || 0}%
                </span>
                <span className="text-sm text-muted-foreground">Complete</span>
              </div>
              <Progress value={completion?.overallPercentage || 0} className="h-3" />
            </div>

            {/* Breakdown */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Video className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Videos Watched</span>
                </div>
                <p className="text-2xl font-bold">
                  {completion?.videosWatched || 0} / {completion?.totalVideos || 12}
                </p>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Download className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Resources Downloaded</span>
                </div>
                <p className="text-2xl font-bold">
                  {completion?.resourcesDownloaded || 0} / {completion?.totalResources || 15}
                </p>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Tracks Completed</span>
                </div>
                <p className="text-2xl font-bold">
                  {completion?.tracksCompleted || 0} / {completion?.totalTracks || 7}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Continue Learning */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Continue Learning</CardTitle>
          </CardHeader>
          <CardContent>
            {nextEpisode && (
              <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg">
                <div className="flex items-start gap-4">
                  <div
                    className="w-20 h-20 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      background: `linear-gradient(135deg, #10b981, #059669)`,
                    }}
                  >
                    <Video className="h-8 w-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <Badge variant="secondary" className="mb-2">
                      Episode {nextEpisode.episodeNumber}
                    </Badge>
                    <h3 className="font-bold text-lg mb-2">{nextEpisode.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      {nextEpisode.description}
                    </p>
                    <Button asChild>
                      <Link href={`/academy?episode=${nextEpisode.id}`}>
                        <Play className="h-4 w-4 mr-2" />
                        Continue Watching
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {progress?.badges && progress.badges.length > 0 ? (
                progress.badges.map((badge) => (
                  <div
                    key={badge}
                    className="flex items-center gap-2 p-2 bg-muted rounded-lg"
                  >
                    <Award className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">
                      {badge.replace(/-/g, ' ').toUpperCase()}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Complete tracks to earn badges!
                </p>
              )}

              {/* Certificate */}
              {progress?.certificateEarned && (
                <div className="mt-4 p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-lg border-2 border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="h-5 w-5 text-purple-600" />
                    <span className="font-bold text-purple-900 dark:text-purple-100">
                      Master Certificate
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    You've completed all 7 agent tracks!
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => handleDownloadCertificate()}
                  >
                    <Download className="h-4 w-4" />
                    Download Certificate
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Track Progress */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Agent Track Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {trackProgress.map((track) => (
              <div key={track.track}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: track.trackInfo.color }}
                    />
                    <span className="font-medium">{track.trackInfo.name}</span>
                    {track.completed && (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {track.watched} / {track.total} episodes
                  </span>
                </div>
                <Progress value={track.percentage} className="h-2" />
              </div>
            ))}
          </div>

          <div className="mt-6 text-center">
            <Button variant="outline" asChild>
              <Link href="/academy">
                <ArrowRight className="h-4 w-4 mr-2" />
                Browse All Episodes
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Watch Time</p>
                <p className="text-2xl font-bold">
                  {Math.round((progress?.totalWatchTime || 0) / 60)}min
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Resources Saved</p>
                <p className="text-2xl font-bold">
                  {progress?.resourcesDownloaded.length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Award className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Badges Earned</p>
                <p className="text-2xl font-bold">{progress?.badges.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
