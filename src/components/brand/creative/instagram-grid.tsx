'use client';

import { Heart, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DeeboBadge } from './deebo-badge';

export interface InstagramPost {
  id: string;
  imageUrl: string;
  likes: number;
  comments: number;
  isDraft?: boolean;
  complianceStatus?: 'active' | 'warning' | 'review_needed';
}

interface InstagramGridProps {
  posts: InstagramPost[];
  onSelect: (post: InstagramPost) => void;
}

export function InstagramGrid({ posts, onSelect }: InstagramGridProps) {
  return (
    <div className="bg-white border rounded-xl overflow-hidden shadow-sm max-w-[400px] mx-auto">
      {/* IG Header Mock */}
      <div className="p-4 border-b flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 p-[2px]">
            <div className="w-full h-full rounded-full bg-white border-2 border-transparent overflow-hidden">
                <div className="w-full h-full bg-slate-100 flex items-center justify-center text-xs text-muted-foreground">Logo</div>
            </div>
        </div>
        <div className="flex-1 space-y-1">
            <h3 className="font-bold text-sm">Your Brand</h3>
            <p className="text-xs text-muted-foreground">Cannabis • Lifestyle</p>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-[1px] bg-slate-100 dark:bg-slate-800">
        {posts.map((post) => (
          <div 
            key={post.id} 
            className="group relative aspect-square bg-slate-50 cursor-pointer overflow-hidden"
            onClick={() => onSelect(post)}
          >
            <img 
                src={post.imageUrl} 
                alt="" 
                className={cn(
                    "w-full h-full object-cover transition-transform duration-500 group-hover:scale-105",
                    post.isDraft && "opacity-75 blur-[1px]"
                )}
            />
            
            {/* Overlay for live posts */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 text-white">
                <span className="flex items-center gap-1 text-xs font-bold"><Heart className="w-3 h-3 fill-white" /> {post.likes}</span>
                <span className="flex items-center gap-1 text-xs font-bold"><MessageCircle className="w-3 h-3 fill-white" /> {post.comments}</span>
            </div>

            {/* Ghost / Draft Indicator */}
            {post.isDraft && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-2 bg-purple-500/10 backdrop-blur-[1px]">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white px-2 py-1 bg-purple-600 rounded mb-1">
                        Ghost
                    </span>
                    {post.complianceStatus && (
                         <div className="scale-75 origin-top">
                             <DeeboBadge status={post.complianceStatus} />
                         </div>
                    )}
                </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
