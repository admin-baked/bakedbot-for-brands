
'use client';

import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { cn } from '@/lib/utils';
import { Copy, Share2, Expand } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

interface AgentResponseCarouselProps {
    content: string;
    className?: string;
}

export function AgentResponseCarousel({ content, className }: AgentResponseCarouselProps) {
    // 1. Parsing Logic
    // We want to split by H1/H2/H3 headers, but keep the header with the content.
    // Regex lookahead: split before match #
    
    const sections = React.useMemo(() => {
        // Normalize: Ensure we start with a header if possible, or treat preamble as first section
        // Split by lines that start with #, ##, ###
        // But we need to keep the delimiter.
        
        // Strategy: First split by newline. Then iterate and group.
        const lines = content.replace(/\r\n/g, '\n').split('\n');
        // console.log('Parsed lines:', lines.length);
        const chunks: { title: string, body: string }[] = [];
        let currentTitle = 'Summary'; // Default for preamble
        let currentBodyLines: string[] = [];

        lines.forEach(line => {
            // Allow optional leading whitespace (0-3 spaces per spec, but we'll accept any for robustness)
            const headerMatch = line.match(/^\s*(#{1,3})\s+(.+)/);
            if (headerMatch) {
                // If we have accumulated body lines, push previous chunk
                if (currentBodyLines.length > 0 || currentTitle !== 'Summary') {
                   // Avoid pushing empty preamble if it's just whitespace
                   const bodyText = currentBodyLines.join('\n');
                   if (bodyText.trim() || currentTitle !== 'Summary') {
                       chunks.push({ title: currentTitle, body: bodyText });
                   }
                }
                // Start new chunk
                currentTitle = headerMatch[2]; // The text after ###
                // Optionally keep the header line in the body? 
                // No, we will make the header the Card Title.
                // But sometimes the header level matters. Let's strip it for the Card Title
                // and put the rest of the text in body.
                currentBodyLines = []; 
            } else {
                currentBodyLines.push(line);
            }
        });

        // Push last chunk
        if (currentBodyLines.length > 0) {
            chunks.push({ title: currentTitle, body: currentBodyLines.join('\n') });
        }

        // Filter out empty chunks
        return chunks.filter(c => c.body.trim().length > 0 || c.title !== 'Summary');
    }, [content]);

    // Fallback if parsing fails or only 1 chunk found (no headers)
    if (sections.length <= 1) {
        return (
            <div className={cn("prose prose-sm max-w-none dark:prose-invert", className)}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
        );
    }

    return (
        <div className={cn("w-full max-w-full overflow-hidden", className)}>
             <Carousel className="w-full" opts={{ align: "start" }}>
                <CarouselContent className="-ml-2 md:-ml-4">
                    {sections.map((section, index) => (
                        <CarouselItem key={index} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                            <Card className="h-full flex flex-col border-emerald-100/50 shadow-sm hover:shadow-md transition-all bg-white/50 backdrop-blur-sm">
                                <CardHeader className="pb-2 bg-emerald-50/30 rounded-t-xl border-b border-emerald-100/50">
                                    <div className="flex justify-between items-start gap-2">
                                        <CardTitle className="text-sm font-semibold text-emerald-900 leading-tight">
                                            {section.title}
                                        </CardTitle>
                                        <div className="flex gap-1 shrink-0">
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-emerald-600" onClick={() => navigator.clipboard.writeText(section.body)}>
                                                <Copy className="h-3 w-3" />
                                            </Button>
                                            {/* Expand Modal - often useful for long section */}
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-emerald-600">
                                                        <Expand className="h-3 w-3" />
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
                                                    <div className="prose prose-sm max-w-none pt-4">
                                                        <h2>{section.title}</h2>
                                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{section.body}</ReactMarkdown>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-1 p-4 text-xs">
                                     {/* Constrain height and scroll to keep cards uniform? Or rely on flex? */}
                                    <div className="prose prose-xs max-w-none text-slate-600 line-clamp-[12] hover:line-clamp-none transition-all">
                                        <ReactMarkdown 
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                table: ({node, ...props}) => <div className="overflow-x-auto my-2 rounded-md border"><table className="w-full text-xs" {...props} /></div>,
                                                th: ({node, ...props}) => <th className="bg-slate-50 p-2 text-left font-semibold text-slate-700" {...props} />,
                                                td: ({node, ...props}) => <td className="p-2 border-t border-slate-100" {...props} />
                                            }}
                                        >
                                            {section.body}
                                        </ReactMarkdown>
                                        {/* Fade out hint if clamped? handled by line-clamp logic visually */}
                                    </div>
                                    <div className="mt-4 pt-2 border-t border-dashed border-slate-200 flex justify-between items-center text-[10px] text-muted-foreground">
                                        <span>Part {index + 1} of {sections.length}</span>
                                        <div className="flex items-center gap-1 text-emerald-600">
                                            <span>Swipe</span>
                                            <Share2 className="h-3 w-3" /> 
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </CarouselItem>
                    ))}
                </CarouselContent>
                {/* Controls - visible on desktop, hidden on mobile usually? */}
                <div className="hidden md:block">
                     <CarouselPrevious className="left-0" />
                     <CarouselNext className="right-0" />
                </div>
             </Carousel>
        </div>
    );
}
