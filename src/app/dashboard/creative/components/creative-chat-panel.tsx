'use client';

/**
 * CreativeChatPanel
 *
 * Lightweight inline Craig chat for the Creative Studio's Generate panel "Chat" mode.
 * Streams responses from /api/creative/chat and parses ---CONTENT_JSON--- blocks
 * to surface a "Load to Canvas" action card.
 */

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, ArrowUpToLine } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { SocialPlatform } from '@/types/creative-content';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ParsedContent {
  caption: string;
  hashtags: string[];
  mediaPrompt?: string;
  platform: SocialPlatform;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  parsedContent?: ParsedContent;
}

export interface CreativeChatPanelProps {
  platform: SocialPlatform;
  brandVoice?: string;
  brandColors?: { primary: string; secondary: string; accent: string };
  onContentFromChat: (content: ParsedContent) => void;
}

// ── Content parser ─────────────────────────────────────────────────────────────

const CONTENT_BLOCK_RE = /---CONTENT_JSON---\s*([\s\S]*?)\s*---END_CONTENT_JSON---/;

function parseContentBlock(text: string): ParsedContent | undefined {
  const match = CONTENT_BLOCK_RE.exec(text);
  if (!match) return undefined;
  try {
    const parsed = JSON.parse(match[1]) as Partial<ParsedContent>;
    if (!parsed.caption) return undefined;
    return {
      caption: parsed.caption,
      hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
      mediaPrompt: parsed.mediaPrompt,
      platform: parsed.platform ?? 'instagram',
    };
  } catch {
    return undefined;
  }
}

// Strip the JSON block from display text
function stripContentBlock(text: string): string {
  return text.replace(CONTENT_BLOCK_RE, '').trim();
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CreativeChatPanel({
  platform,
  brandVoice,
  onContentFromChat,
}: CreativeChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'intro',
      role: 'assistant',
      content: `Hey! I'm Craig — tell me what kind of post you want for ${platform} and I'll write it for you. You can say things like "edgy 420 post" or "educational about terpenes" or ask me anything about your brand strategy.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || isStreaming) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsStreaming(true);

    // Build message history for API (exclude intro message, only user/assistant turns)
    const apiMessages = [...messages, userMsg]
      .filter(m => m.id !== 'intro')
      .map(m => ({ role: m.role, content: m.content }));

    const assistantId = `assistant-${Date.now()}`;
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

    try {
      const res = await fetch('/api/creative/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, platform, brandVoice }),
      });

      if (!res.ok || !res.body) throw new Error('Chat request failed');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') break;
          try {
            const parsed = JSON.parse(payload) as { text: string };
            accumulated += parsed.text;
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantId ? { ...m, content: accumulated } : m,
              ),
            );
          } catch {
            // skip malformed SSE lines
          }
        }
      }

      // Parse content block from final accumulated text
      const parsedContent = parseContentBlock(accumulated);
      if (parsedContent) {
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId
              ? { ...m, content: accumulated, parsedContent }
              : m,
          ),
        );
      }
    } catch {
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? { ...m, content: 'Sorry, something went wrong. Try again.' }
            : m,
        ),
      );
    } finally {
      setIsStreaming(false);
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Craig identity bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border shrink-0">
        <Avatar className="w-6 h-6 border border-border">
          <AvatarImage src="/avatars/craig.png" />
          <AvatarFallback className="text-[9px] bg-blue-500/20 text-blue-400">CR</AvatarFallback>
        </Avatar>
        <div>
          <p className="text-[11px] font-semibold leading-none">Craig</p>
          <p className="text-[9px] text-muted-foreground">Creative Assistant</p>
        </div>
        {isStreaming && <Loader2 className="w-3 h-3 ml-auto text-muted-foreground animate-spin" />}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-3">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={cn('flex gap-2', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}
            >
              {msg.role === 'assistant' && (
                <Avatar className="w-5 h-5 shrink-0 mt-0.5 border border-border">
                  <AvatarImage src="/avatars/craig.png" />
                  <AvatarFallback className="text-[8px] bg-blue-500/20 text-blue-400">CR</AvatarFallback>
                </Avatar>
              )}

              <div className={cn('max-w-[85%] space-y-2', msg.role === 'user' ? 'items-end' : 'items-start')}>
                {/* Message bubble */}
                {(msg.role === 'user' || !msg.parsedContent || stripContentBlock(msg.content)) && (
                  <div
                    className={cn(
                      'rounded-xl px-3 py-2 text-[11px] leading-relaxed',
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                        : 'bg-muted text-foreground rounded-tl-sm',
                    )}
                  >
                    {msg.role === 'assistant'
                      ? stripContentBlock(msg.content) || (isStreaming && msg.content === '' ? '...' : '')
                      : msg.content}
                  </div>
                )}

                {/* Structured content card */}
                {msg.parsedContent && (
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2 w-full">
                    <p className="text-[10px] font-semibold text-primary uppercase tracking-wide">
                      ✨ Content Ready
                    </p>
                    <p className="text-[11px] text-foreground leading-snug line-clamp-3">
                      {msg.parsedContent.caption}
                    </p>
                    {msg.parsedContent.hashtags.length > 0 && (
                      <p className="text-[10px] text-primary/70">
                        {msg.parsedContent.hashtags.map(h => `#${h.replace(/^#/, '')}`).join(' ')}
                      </p>
                    )}
                    <Button
                      size="sm"
                      className="w-full h-7 text-xs bg-primary hover:bg-primary/90"
                      onClick={() => onContentFromChat(msg.parsedContent!)}
                    >
                      <ArrowUpToLine className="w-3 h-3 mr-1.5" />
                      Load to Canvas
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border p-2 shrink-0 flex gap-2">
        <Textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ask Craig anything..."
          className="min-h-[36px] max-h-[80px] text-xs resize-none"
          disabled={isStreaming}
        />
        <Button
          size="icon"
          className="shrink-0 h-9 w-9"
          onClick={handleSend}
          disabled={!input.trim() || isStreaming}
        >
          {isStreaming ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}
