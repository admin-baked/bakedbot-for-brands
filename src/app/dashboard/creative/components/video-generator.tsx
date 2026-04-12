'use client';

/**
 * HeyGen Video Generator — Creative Center Panel
 *
 * Super Users can generate avatar walkthrough videos from the dashboard.
 * Uses the HeyGen API v2 with the Martez Knox avatar.
 */

import { useState, useEffect, useRef } from 'react';
import { Video, Play, Loader2, CheckCircle2, XCircle, Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  generateHeyGenVideo,
  getHeyGenVideoStatus,
  getOnboardingBackgrounds,
  isHeyGenConfigured,
} from '@/server/actions/heygen-video';

interface Background {
  stepId: string;
  url: string;
  label: string;
}

interface VideoJob {
  id: string;
  title: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  error?: string;
  submittedAt: Date;
}

export function VideoGenerator() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [backgrounds, setBackgrounds] = useState<Background[]>([]);
  const [title, setTitle] = useState('');
  const [narration, setNarration] = useState('');
  const [selectedBackground, setSelectedBackground] = useState<string>('none');
  const [layout, setLayout] = useState<'circle' | 'fullscreen'>('circle');
  const [generating, setGenerating] = useState(false);
  const [jobs, setJobs] = useState<VideoJob[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check config + load backgrounds on mount
  useEffect(() => {
    isHeyGenConfigured().then(setConfigured);
    getOnboardingBackgrounds().then(setBackgrounds);
  }, []);

  // Poll pending jobs
  useEffect(() => {
    const pendingJobs = jobs.filter(j => j.status === 'pending' || j.status === 'processing');
    if (pendingJobs.length === 0) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }

    pollRef.current = setInterval(async () => {
      const updated = await Promise.all(
        jobs.map(async (job) => {
          if (job.status !== 'pending' && job.status !== 'processing') return job;
          const result = await getHeyGenVideoStatus(job.id);
          if (result.status === 'completed') {
            toast.success(`Video "${job.title}" is ready!`);
          } else if (result.status === 'failed') {
            toast.error(`Video "${job.title}" failed: ${result.error}`);
          }
          return { ...job, status: result.status, videoUrl: result.videoUrl, error: result.error };
        }),
      );
      setJobs(updated);
    }, 15_000);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [jobs]);

  const handleGenerate = async () => {
    if (!title.trim() || !narration.trim()) {
      toast.error('Title and narration are required');
      return;
    }

    setGenerating(true);
    const backgroundUrl = selectedBackground !== 'none'
      ? backgrounds.find(b => b.stepId === selectedBackground)?.url
      : undefined;

    const result = await generateHeyGenVideo({
      title: title.trim(),
      narration: narration.trim(),
      backgroundUrl,
      layout,
    });

    if (result.success && result.videoId) {
      const job: VideoJob = {
        id: result.videoId,
        title: title.trim(),
        status: 'pending',
        submittedAt: new Date(),
      };
      setJobs(prev => [job, ...prev]);
      toast.success('Video submitted! Polling for completion...');
      setTitle('');
      setNarration('');
    } else {
      toast.error(result.error || 'Failed to generate video');
    }
    setGenerating(false);
  };

  if (configured === null) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-1">HeyGen not configured</p>
        <p>Set <code className="text-xs bg-muted px-1 rounded">HEYGEN_API_KEY</code>, <code className="text-xs bg-muted px-1 rounded">HEYGEN_AVATAR_ID</code>, and <code className="text-xs bg-muted px-1 rounded">HEYGEN_VOICE_ID</code> in your environment.</p>
      </div>
    );
  }

  const charCount = narration.length;
  const estMinutes = (charCount / 900).toFixed(1);

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Video Generator</h3>
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <Label className="text-xs">Title</Label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Brand Guide Walkthrough"
            className="w-full h-8 px-2 text-sm rounded-md border border-border bg-background"
          />
        </div>

        {/* Narration */}
        <div className="space-y-1.5">
          <Label className="text-xs">
            Narration Script
            {charCount > 0 && (
              <span className="ml-2 text-muted-foreground">
                {charCount} chars / ~{estMinutes} min
              </span>
            )}
          </Label>
          <Textarea
            value={narration}
            onChange={(e) => setNarration(e.target.value)}
            placeholder="Enter the narration text the avatar will speak..."
            rows={6}
            className="text-sm resize-none"
          />
        </div>

        {/* Background */}
        <div className="space-y-1.5">
          <Label className="text-xs">Background</Label>
          <Select value={selectedBackground} onValueChange={setSelectedBackground}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select background" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Dark (default)</SelectItem>
              {backgrounds.map((bg) => (
                <SelectItem key={bg.stepId} value={bg.stepId}>
                  {bg.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Layout */}
        <div className="space-y-1.5">
          <Label className="text-xs">Avatar Layout</Label>
          <div className="flex rounded-lg border border-border bg-muted/40 p-0.5">
            {(['circle', 'fullscreen'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setLayout(mode)}
                className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-all ${
                  layout === mode
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {mode === 'circle' ? 'Circle (Loom-style)' : 'Full Screen'}
              </button>
            ))}
          </div>
        </div>

        {/* Generate button */}
        <Button
          onClick={handleGenerate}
          disabled={generating || !title.trim() || !narration.trim()}
          className="w-full"
          size="sm"
        >
          {generating ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 mr-1.5" />
              Generate Video (~{estMinutes || '0'} min)
            </>
          )}
        </Button>

        {/* Jobs list */}
        {jobs.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border">
            <h4 className="text-xs font-medium text-muted-foreground">Recent Jobs</h4>
            {jobs.map((job) => (
              <div
                key={job.id}
                className="rounded-lg border border-border p-3 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium truncate">{job.title}</span>
                  <StatusBadge status={job.status} />
                </div>

                {job.status === 'completed' && job.videoUrl && (
                  <div className="space-y-2">
                    <video
                      src={job.videoUrl}
                      controls
                      className="w-full rounded-md bg-black max-h-[160px]"
                    />
                    <a
                      href={job.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <Download className="w-3 h-3" />
                      Download
                    </a>
                  </div>
                )}

                {job.status === 'failed' && job.error && (
                  <p className="text-destructive">{job.error}</p>
                )}

                {(job.status === 'pending' || job.status === 'processing') && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>{job.status === 'pending' ? 'Queued...' : 'Rendering...'}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

function StatusBadge({ status }: { status: VideoJob['status'] }) {
  switch (status) {
    case 'completed':
      return (
        <span className="inline-flex items-center gap-1 text-green-600 text-[10px]">
          <CheckCircle2 className="w-3 h-3" />
          Done
        </span>
      );
    case 'failed':
      return (
        <span className="inline-flex items-center gap-1 text-destructive text-[10px]">
          <XCircle className="w-3 h-3" />
          Failed
        </span>
      );
    case 'processing':
      return (
        <span className="inline-flex items-center gap-1 text-amber-500 text-[10px]">
          <RefreshCw className="w-3 h-3 animate-spin" />
          Rendering
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 text-muted-foreground text-[10px]">
          <Loader2 className="w-3 h-3 animate-spin" />
          Queued
        </span>
      );
  }
}
