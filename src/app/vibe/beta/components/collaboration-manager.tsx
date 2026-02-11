'use client';

/**
 * Collaboration Manager
 *
 * UI for starting and managing real-time collaboration sessions.
 */

import { useState } from 'react';
import {
  createCollaborationSession,
  generateCollaborationLink,
  endCollaborationSession,
} from '../collaboration-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Users, Copy, Check, Share2, Link as LinkIcon } from 'lucide-react';

interface CollaborationManagerProps {
  projectId: string;
  userId: string;
  userName: string;
  onSessionStart?: (sessionId: string) => void;
}

export function CollaborationManager({
  projectId,
  userId,
  userName,
  onSessionStart,
}: CollaborationManagerProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [collaborationLink, setCollaborationLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  async function handleStartSession() {
    setLoading(true);
    setError('');

    try {
      const result = await createCollaborationSession({
        projectId,
        userId,
        userName,
      });

      if (result.success && result.sessionId) {
        setSessionId(result.sessionId);

        // Generate shareable link
        const linkResult = await generateCollaborationLink(result.sessionId);
        setCollaborationLink(linkResult.link);

        if (onSessionStart) {
          onSessionStart(result.sessionId);
        }
      } else {
        setError(result.error || 'Failed to start session');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start session');
    } finally {
      setLoading(false);
    }
  }

  async function handleEndSession() {
    if (!sessionId) return;

    setLoading(true);
    try {
      await endCollaborationSession(sessionId, userId);
      setSessionId(null);
      setCollaborationLink('');
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end session');
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(collaborationLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Users className="w-4 h-4 mr-2" />
          Collaborate
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Real-Time Collaboration</DialogTitle>
          <DialogDescription>
            Invite others to edit this project together in real-time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!sessionId ? (
            // Start Session
            <>
              <Alert>
                <Users className="h-4 w-4" />
                <AlertTitle>Collaborative Editing</AlertTitle>
                <AlertDescription>
                  Start a session to enable real-time multi-user editing with live cursors
                  and chat.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label>Features</Label>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Real-time code synchronization</li>
                  <li>Live cursor tracking</li>
                  <li>Built-in chat</li>
                  <li>File locking</li>
                  <li>Conflict resolution</li>
                </ul>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </>
          ) : (
            // Active Session
            <>
              <Alert className="bg-green-50 border-green-200">
                <Users className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Session Active</AlertTitle>
                <AlertDescription className="text-green-700">
                  Your collaboration session is now live. Share the link below to invite
                  others.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label>Session ID</Label>
                <div className="flex items-center gap-2">
                  <Input value={sessionId} readOnly />
                  <Badge variant="secondary">Active</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Shareable Link</Label>
                <div className="flex items-center gap-2">
                  <Input value={collaborationLink} readOnly />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyToClipboard}
                    title="Copy link"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Anyone with this link can join the session and edit the project.
                </p>
              </div>

              <div className="pt-4 border-t">
                <h4 className="text-sm font-medium mb-2">Quick Share</h4>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      window.open(
                        `https://twitter.com/intent/tweet?text=Join me for live coding on BakedBot Vibe IDE!&url=${encodeURIComponent(
                          collaborationLink
                        )}`,
                        '_blank'
                      );
                    }}
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Twitter
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      window.open(
                        `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
                          collaborationLink
                        )}`,
                        '_blank'
                      );
                    }}
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    LinkedIn
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      window.location.href = `mailto:?subject=Join my coding session&body=Join me for live coding: ${collaborationLink}`;
                    }}
                  >
                    <LinkIcon className="w-4 h-4 mr-2" />
                    Email
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          {!sessionId ? (
            <Button onClick={handleStartSession} disabled={loading}>
              {loading ? 'Starting...' : 'Start Session'}
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Close
              </Button>
              <Button variant="destructive" onClick={handleEndSession} disabled={loading}>
                {loading ? 'Ending...' : 'End Session'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
