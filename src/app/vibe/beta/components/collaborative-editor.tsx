'use client';

/**
 * Collaborative Code Editor
 *
 * Real-time multi-user code editor with cursor tracking and chat.
 */

import { useEffect, useState, useRef } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import { CollaborationService } from '@/lib/collaboration-service';
import type {
  CollaborationParticipant,
  CursorPosition,
  FileState,
  ChatMessage,
} from '@/types/collaboration';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, MessageSquare, Lock, Unlock, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollaborativeEditorProps {
  sessionId: string;
  userId: string;
  userName: string;
  filePath: string;
  initialContent: string;
  language: string;
  onContentChange?: (content: string) => void;
}

export function CollaborativeEditor({
  sessionId,
  userId,
  userName,
  filePath,
  initialContent,
  language,
  onContentChange,
}: CollaborativeEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [participants, setParticipants] = useState<CollaborationParticipant[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockedBy, setLockedBy] = useState<string | null>(null);

  const collaborationRef = useRef<CollaborationService | null>(null);
  const editorRef = useRef<any | null>(null);
  const decorationsRef = useRef<string[]>([]);

  // Initialize collaboration service
  useEffect(() => {
    const collaboration = new CollaborationService(sessionId, userId, userName);
    collaborationRef.current = collaboration;

    // Join session
    collaboration.join().catch((error) => {
      console.error('Failed to join collaboration session:', error);
    });

    // Subscribe to participants
    collaboration.subscribeToParticipants((newParticipants) => {
      setParticipants(newParticipants);
    });

    // Subscribe to file changes
    collaboration.subscribeToFile(filePath, (fileState) => {
      if (fileState.lastModifiedBy !== userId) {
        setContent(fileState.content);
        if (onContentChange) {
          onContentChange(fileState.content);
        }
      }
      setLockedBy(fileState.lockedBy || null);
    });

    // Subscribe to chat
    collaboration.subscribeToChat((messages) => {
      setChatMessages(messages);
    });

    // Open file
    collaboration.openFile(filePath);

    // Cleanup
    return () => {
      collaboration.leave();
    };
  }, [sessionId, userId, userName, filePath]);

  // Update cursor decorations
  useEffect(() => {
    if (!editorRef.current) return;

    const editor = editorRef.current;
    const model = editor.getModel();
    if (!model) return;

    // Create decorations for other users' cursors
    const newDecorations: any[] = [];

    participants.forEach((participant) => {
      if (participant.userId === userId) return;
      if (!participant.cursorPosition) return;

      const { line, column } = participant.cursorPosition;

      newDecorations.push({
        range: new (window as any).monaco.Range(line, column, line, column + 1),
        options: {
          className: 'cursor-decoration',
          beforeContentClassName: 'cursor-marker',
          glyphMarginClassName: 'cursor-glyph',
          after: {
            content: ` ${participant.userName}`,
            inlineClassName: 'cursor-label',
            inlineClassNameAffectsLetterSpacing: true,
          },
          stickiness: 1,
        },
      });
    });

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);
  }, [participants, userId]);

  function handleEditorMount(
    editor: any,
    monaco: Monaco
  ) {
    editorRef.current = editor;

    // Track cursor position
    editor.onDidChangeCursorPosition((e: any) => {
      if (!collaborationRef.current) return;

      const position: CursorPosition = {
        line: e.position.lineNumber,
        column: e.position.column,
      };

      collaborationRef.current.updateCursor(position);
    });

    // Track content changes
    editor.onDidChangeModelContent(() => {
      const newContent = editor.getValue();
      setContent(newContent);

      if (collaborationRef.current) {
        // Apply edit to collaboration service
        collaborationRef.current.applyEdit(
          filePath,
          {
            type: 'insert',
            position: { line: 1, column: 1 },
            text: newContent,
          },
          newContent
        );
      }

      if (onContentChange) {
        onContentChange(newContent);
      }
    });

    // Add custom styles for cursors
    const style = document.createElement('style');
    style.textContent = `
      .cursor-decoration {
        background-color: rgba(255, 0, 0, 0.2);
      }
      .cursor-marker {
        border-left: 2px solid red;
      }
      .cursor-label {
        background-color: red;
        color: white;
        padding: 2px 4px;
        border-radius: 2px;
        font-size: 10px;
        margin-left: 4px;
      }
    `;
    document.head.appendChild(style);
  }

  async function handleLockToggle() {
    if (!collaborationRef.current) return;

    if (isLocked && lockedBy === userId) {
      await collaborationRef.current.unlockFile(filePath);
      setIsLocked(false);
    } else if (!isLocked) {
      const locked = await collaborationRef.current.lockFile(filePath);
      setIsLocked(locked);
    }
  }

  async function handleSendMessage() {
    if (!chatInput.trim() || !collaborationRef.current) return;

    await collaborationRef.current.sendChatMessage(chatInput);
    setChatInput('');
  }

  const otherParticipants = participants.filter((p) => p.userId !== userId);

  return (
    <div className="flex h-full">
      {/* Editor */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between p-2 border-b bg-background">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {participants.length} online
            </Badge>

            {lockedBy && (
              <Badge variant="secondary">
                <Lock className="w-3 h-3 mr-1" />
                Locked by {participants.find((p) => p.userId === lockedBy)?.userName}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLockToggle}
              disabled={lockedBy !== null && lockedBy !== userId}
            >
              {isLocked ? (
                <>
                  <Unlock className="w-4 h-4 mr-2" />
                  Unlock
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Lock File
                </>
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowChat(!showChat)}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Chat
            </Button>
          </div>
        </div>

        {/* Monaco Editor */}
        <div className="flex-1">
          <Editor
            height="100%"
            language={language}
            value={content}
            onMount={handleEditorMount}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              readOnly: lockedBy !== null && lockedBy !== userId,
              automaticLayout: true,
            }}
          />
        </div>

        {/* Active Users */}
        <div className="flex items-center gap-2 p-2 border-t bg-muted/50">
          <span className="text-sm text-muted-foreground">Editing:</span>
          {otherParticipants.map((participant) => (
            <div
              key={participant.userId}
              className="flex items-center gap-2"
              title={participant.userName}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: participant.color }}
              />
              <span className="text-sm">{participant.userName}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Sidebar */}
      {showChat && (
        <Card className="w-80 border-l rounded-none">
          <CardHeader className="border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Chat
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex flex-col h-[calc(100vh-12rem)]">
            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'flex gap-2',
                      message.userId === userId && 'flex-row-reverse'
                    )}
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={message.userAvatar} />
                      <AvatarFallback>
                        {message.userName.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={cn(
                        'flex-1 space-y-1',
                        message.userId === userId && 'text-right'
                      )}
                    >
                      <div className="text-xs text-muted-foreground">
                        {message.userName}
                      </div>
                      <div
                        className={cn(
                          'inline-block px-3 py-2 rounded-lg text-sm',
                          message.userId === userId
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        )}
                      >
                        {message.message}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button size="icon" onClick={handleSendMessage}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
