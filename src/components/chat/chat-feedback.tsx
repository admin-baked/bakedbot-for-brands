'use client';

import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Copy, Check, MessageSquareWarning, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ChatFeedbackProps {
    messageId: string;
    content: string;
    className?: string;
}

export function ChatFeedback({ messageId, content, className }: ChatFeedbackProps) {
    const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
    const [isCopied, setIsCopied] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Modal State
    const [reason, setReason] = useState('other');
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(content);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
        toast.success("Message copied to clipboard");
    };

    const handleFeedback = (type: 'up' | 'down') => {
        // If toggling off
        if (feedback === type) {
            setFeedback(null);
            return;
        }

        setFeedback(type);
        
        if (type === 'up') {
            toast.success("Thanks for the positive feedback!");
            // TODO: Analytics tracking
        } else {
            setIsModalOpen(true);
        }
    };

    const submitNegativeFeedback = async () => {
        setIsSubmitting(true);
        
        // Simulate API call to creating a ticket
        await new Promise(r => setTimeout(r, 800));
        
        console.log('Feedback Submitted:', {
            messageId,
            reason,
            comment,
            timestamp: new Date()
        });
        
        // TODO: Call actual ticket creation server action here
        // await createSupportTicket({ ... })

        toast.success("Feedback submitted. We've created a ticket for our team.");
        setIsSubmitting(false);
        setIsModalOpen(false);
        setComment('');
        setReason('other');
    };

    return (
        <div className={cn("flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity", className)}>
            <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={handleCopy}
                title="Copy to clipboard"
            >
                {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </Button>
            
            <div className="h-3 w-px bg-border mx-1" />
            
            <Button
                variant="ghost"
                size="icon"
                className={cn("h-6 w-6 text-muted-foreground hover:text-green-600", feedback === 'up' && "text-green-600 bg-green-50")}
                onClick={() => handleFeedback('up')}
                title="Helpful"
            >
                <ThumbsUp className="h-3 w-3" />
            </Button>
            
            <Button
                variant="ghost"
                size="icon"
                className={cn("h-6 w-6 text-muted-foreground hover:text-red-600", feedback === 'down' && "text-red-600 bg-red-50")}
                onClick={() => handleFeedback('down')}
                title="Not helpful"
            >
                <ThumbsDown className="h-3 w-3" />
            </Button>

            {/* Negative Feedback Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>How can we improve?</DialogTitle>
                        <DialogDescription>
                            Your feedback helps us train our agents. A ticket will be created for our engineering team.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="grid gap-4 py-4">
                        <RadioGroup value={reason} onValueChange={setReason} className="grid grid-cols-2 gap-2">
                             {[
                                 { id: 'hallucination', label: 'Inaccurate Info' },
                                 { id: 'unsafe', label: 'Unsafe / Harmful' },
                                 { id: 'bug', label: 'Bug / Broken' },
                                 { id: 'lazy', label: 'Too Lazy' },
                                 { id: 'useless', label: 'Not Helpful' },
                                 { id: 'other', label: 'Other' }
                             ].map((item) => (
                                 <div key={item.id}>
                                     <RadioGroupItem value={item.id} id={item.id} className="peer sr-only" />
                                     <Label
                                         htmlFor={item.id}
                                         className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer text-xs text-center font-medium"
                                     >
                                         {item.label}
                                     </Label>
                                 </div>
                             ))}
                        </RadioGroup>
                        
                        <div className="grid gap-2">
                            <Label htmlFor="comment">Additional Details (Optional)</Label>
                            <Textarea
                                id="comment"
                                placeholder="What happened? What did you expect?"
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                className="resize-none"
                                rows={3}
                            />
                        </div>
                    </div>
                    
                    <DialogFooter className="sm:justify-between">
                         <div className="flex items-center text-xs text-muted-foreground">
                             <MessageSquareWarning className="h-3 w-3 mr-1.5" />
                             Ticket #FEL-{Math.floor(Math.random()*1000)}
                         </div>
                         <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                            <Button size="sm" onClick={submitNegativeFeedback} disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                                Submit Feedback
                            </Button>
                         </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
