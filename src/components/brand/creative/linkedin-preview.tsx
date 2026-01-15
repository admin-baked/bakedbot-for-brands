'use client';

import { MoreHorizontal, ThumbsUp, MessageSquare, Share2, Send } from 'lucide-react';
import { DeeboBadge } from './deebo-badge';

export interface LinkedInPost {
  id: string;
  authorName: string;
  authorTitle: string;
  authorImage?: string;
  content: string;
  mediaType: 'image' | 'carousel';
  mediaUrl: string;
  complianceStatus: 'active' | 'warning' | 'review_needed';
}

interface LinkedInPreviewProps {
  post: LinkedInPost;
}

export function LinkedInPreview({ post }: LinkedInPreviewProps) {
  return (
    <div className="bg-white border rounded-lg shadow-sm max-w-[500px] mx-auto overflow-hidden font-sans">
      {/* Header */}
      <div className="p-3 flex gap-3 text-sm">
        <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
            {post.authorImage ? (
                <img src={post.authorImage} alt="" className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">
                    {post.authorName[0]}
                </div>
            )}
        </div>
        <div className="flex-1">
            <div className="font-semibold text-slate-900 leading-tight hover:underline cursor-pointer">
                {post.authorName}
            </div>
            <div className="text-xs text-slate-500 line-clamp-1">{post.authorTitle}</div>
            <div className="text-xs text-slate-500 flex items-center gap-1">
                <span>1h • </span>
                <span className="text-[10px] border px-0.5 rounded border-slate-400">🌐</span>
            </div>
        </div>
        <button className="text-slate-500">
            <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Text Content */}
      <div className="px-3 pb-2 text-sm text-slate-800 whitespace-pre-wrap">
        {post.content}
        <span className="text-blue-600 font-semibold cursor-pointer"> ...see more</span>
      </div>

      {/* Media Content */}
      <div className="relative bg-slate-100 overflow-hidden border-t border-b border-slate-100">
          <img src={post.mediaUrl} alt="Post content" className="w-full h-auto object-cover max-h-[500px]" />
          
          {post.mediaType === 'carousel' && (
              <div className="absolute bottom-4 right-4 bg-black/70 text-white text-xs px-2 py-1 rounded">
                  1 / 5
              </div>
          )}

          {/* Deebo Overlay */}
          <div className="absolute top-4 right-4">
              <DeeboBadge status={post.complianceStatus} className="shadow-lg backdrop-blur bg-white/80" />
          </div>
      </div>

      {/* Engagement Stats */}
      <div className="px-3 py-2 text-xs text-slate-500 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1 hover:text-blue-600 hover:underline cursor-pointer">
             <div className="flex -space-x-1">
                  <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center z-10">
                      <ThumbsUp className="w-2 h-2 text-blue-600 fill-blue-600" />
                  </div>
             </div>
             <span>124</span>
          </div>
          <div className="hover:text-blue-600 hover:underline cursor-pointer">
              12 comments • 4 reposts
          </div>
      </div>

      {/* Action Buttons */}
      <div className="px-2 py-1 flex items-center justify-between">
          <ActionButton icon={ThumbsUp} label="Like" />
          <ActionButton icon={MessageSquare} label="Comment" />
          <ActionButton icon={Share2} label="Repost" />
          <ActionButton icon={Send} label="Send" />
      </div>
    </div>
  );
}

function ActionButton({ icon: Icon, label }: { icon: any, label: string }) {
    return (
        <button className="flex items-center gap-1.5 px-3 py-3 rounded hover:bg-slate-100 text-slate-500 font-semibold text-sm transition-colors flex-1 justify-center">
            <Icon className="w-5 h-5" />
            <span className="hidden sm:inline">{label}</span>
        </button>
    );
}
