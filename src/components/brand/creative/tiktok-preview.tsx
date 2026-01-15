'use client';

import { Heart, MessageCircle, Share2, Music2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DeeboBadge } from './deebo-badge';

export interface TikTokPost {
  id: string;
  videoUrl?: string; // Optional for mock
  thumbnailUrl: string;
  caption: string;
  audioName: string;
  complianceStatus: 'active' | 'warning' | 'review_needed';
}

interface TikTokPreviewProps {
  post: TikTokPost;
}

export function TikTokPreview({ post }: TikTokPreviewProps) {
  return (
    <div className="relative mx-auto aspect-[9/16] w-full max-w-[320px] bg-black rounded-2xl overflow-hidden shadow-xl border border-border/50">
      
      {/* Video / Thumbnail Layer */}
      <div className="absolute inset-0 bg-zinc-900">
        <img 
            src={post.thumbnailUrl} 
            alt="TikTok Preview" 
            className="w-full h-full object-cover opacity-80" 
        />
        {/* Play Icon Placeholder */}
        <div className="absolute inset-0 flex items-center justify-center opacity-50">
             <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <div className="w-0 h-0 border-t-[10px] border-t-transparent border-l-[18px] border-l-white border-b-[10px] border-b-transparent ml-1" />
             </div>
        </div>
      </div>

      {/* UI Overlay */}
      <div className="absolute inset-x-4 bottom-8 flex flex-col justify-end text-white text-shadow-sm select-none">
        
        {/* Creator Info */}
        <div className="mb-3">
            <h4 className="font-semibold text-sm mb-1">@yourbrand</h4>
            <p className="text-xs opacity-90 leading-snug line-clamp-2">
                {post.caption}
                <span className="font-bold ml-1">#bakedbot #cannabis</span>
            </p>
        </div>

        {/* Audio Info */}
        <div className="flex items-center gap-2 text-xs opacity-90 mb-2 animate-pulse-slow">
            <Music2 className="w-3 h-3" />
            <div className="overflow-hidden w-32">
                 <div className="whitespace-nowrap">{post.audioName} - Trending Audio</div>
            </div>
        </div>

        {/* Safe Zone Warning (Visual Guide only visible in draft mode) */}
        <div className="absolute -right-2 bottom-12 flex flex-col gap-6 items-center">
            <div className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
                    <Heart className="w-6 h-6 fill-white text-white" />
                </div>
                <span className="text-[10px] font-bold">12.5K</span>
            </div>
            
             <div className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
                    <MessageCircle className="w-6 h-6 fill-white text-white" />
                </div>
                <span className="text-[10px] font-bold">420</span>
            </div>

            <div className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
                    <Share2 className="w-6 h-6 fill-white text-white" />
                </div>
                <span className="text-[10px] font-bold">Share</span>
            </div>
        </div>

      </div>

      {/* Compliance Badge Overlay (Top Left) */}
      <div className="absolute top-14 left-4">
        <DeeboBadge status={post.complianceStatus} />
      </div>
    </div>
  );
}
