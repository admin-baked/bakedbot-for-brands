'use client';

/**
 * Social Share Buttons
 *
 * Share episodes on Twitter, LinkedIn, and Email with pre-populated content
 */

import { Button } from '@/components/ui/button';
import { Twitter, Linkedin, Mail, Share2 } from 'lucide-react';
import type { AcademyEpisode } from '@/types/academy';

export interface SocialShareButtonsProps {
  episode: AcademyEpisode;
}

export function SocialShareButtons({ episode }: SocialShareButtonsProps) {
  const shareUrl = `https://bakedbot.ai/academy?episode=${episode.id}&utm_source=social&utm_medium=share`;
  const shareText = `Just watched "${episode.title}" in the Cannabis Marketing AI Academy! 🌱 Learn AI-powered cannabis marketing for free.`;

  const handleTwitterShare = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      shareText
    )}&url=${encodeURIComponent(shareUrl)}&via=BakedBotAI`;
    window.open(twitterUrl, '_blank', 'width=550,height=420');
  };

  const handleLinkedInShare = () => {
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
      shareUrl
    )}`;
    window.open(linkedInUrl, '_blank', 'width=550,height=550');
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent(`Check out: ${episode.title}`);
    const body = encodeURIComponent(
      `I thought you'd be interested in this episode from the Cannabis Marketing AI Academy:\n\n"${episode.title}"\n\n${episode.description}\n\nWatch it here: ${shareUrl}\n\nIt's completely free!`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      // Could add a toast notification here
      alert('Link copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground mr-2">Share:</span>
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={handleTwitterShare}
        title="Share on Twitter"
      >
        <Twitter className="h-4 w-4" />
        <span className="hidden sm:inline">Twitter</span>
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={handleLinkedInShare}
        title="Share on LinkedIn"
      >
        <Linkedin className="h-4 w-4" />
        <span className="hidden sm:inline">LinkedIn</span>
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={handleEmailShare}
        title="Share via Email"
      >
        <Mail className="h-4 w-4" />
        <span className="hidden sm:inline">Email</span>
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={handleCopyLink}
        title="Copy Link"
      >
        <Share2 className="h-4 w-4" />
        <span className="hidden sm:inline">Copy</span>
      </Button>
    </div>
  );
}
