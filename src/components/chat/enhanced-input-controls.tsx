'use client';

/**
 * Enhanced Input Area for AgentChat
 * Adds file upload, voice input, and voice output capabilities
 * while preserving the existing AgentChat design
 */

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
    Paperclip,
    Mic,
    MicOff,
    Volume2,
    VolumeX,
    Loader2,
    X,
    Image as ImageIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVoiceInput } from '@/hooks/use-voice-input';
import { useVoiceOutput } from '@/hooks/use-voice-output';
import { useFileUpload, type UploadedFile } from '@/hooks/use-file-upload';

interface EnhancedInputProps {
    onFilesUploaded?: (files: UploadedFile[]) => void;
    onVoiceTranscript?: (transcript: string) => void;
    voiceOutputEnabled?: boolean;
    className?: string;
}

export function EnhancedInputControls({
    onFilesUploaded,
    onVoiceTranscript,
    voiceOutputEnabled = false,
    className
}: EnhancedInputProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const voiceInput = useVoiceInput();
    const voiceOutput = useVoiceOutput();
    const fileUpload = useFileUpload();

    // Sync voice output state with prop
    if (voiceOutput.isEnabled !== voiceOutputEnabled) {
        voiceOutput.setIsEnabled(voiceOutputEnabled);
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            await fileUpload.uploadFiles(e.target.files);
            if (onFilesUploaded) {
                onFilesUploaded(fileUpload.files);
            }
            e.target.value = ''; // Reset
        }
    };

    const handleVoiceToggle = () => {
        if (voiceInput.isListening) {
            voiceInput.stopListening();
            if (voiceInput.transcript && onVoiceTranscript) {
                onVoiceTranscript(voiceInput.transcript);
                voiceInput.resetTranscript();
            }
        } else {
            voiceInput.startListening();
        }
    };

    return (
        <div className={cn("flex items-center gap-2", className)}>
            {/* File Upload */}
            <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".csv,.txt,.pdf,.jpg,.jpeg,.png,.webp,.json"
                className="hidden"
                onChange={handleFileUpload}
            />
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => fileInputRef.current?.click()}
                disabled={fileUpload.isUploading}
                title="Upload files (CSV, PDF, images)"
            >
                {fileUpload.isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <Paperclip className="h-4 w-4" />
                )}
            </Button>

            {/* Voice Input */}
            {voiceInput.isSupported && (
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                        "h-8 w-8",
                        voiceInput.isListening && "bg-red-500/20 text-red-600"
                    )}
                    onClick={handleVoiceToggle}
                    title={voiceInput.isListening ? "Stop recording" : "Voice input"}
                >
                    {voiceInput.isListening ? (
                        <MicOff className="h-4 w-4 animate-pulse" />
                    ) : (
                        <Mic className="h-4 w-4" />
                    )}
                </Button>
            )}

            {/* Voice Output Toggle */}
            {voiceOutput.isSupported && (
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                        "h-8 w-8",
                        voiceOutput.isEnabled && "bg-primary/20"
                    )}
                    onClick={voiceOutput.toggle}
                    title={voiceOutput.isEnabled ? "Disable voice responses" : "Enable voice responses"}
                >
                    {voiceOutput.isEnabled ? (
                        <Volume2 className="h-4 w-4 text-primary" />
                    ) : (
                        <VolumeX className="h-4 w-4" />
                    )}
                </Button>
            )}
        </div>
    );
}

/**
 * File Upload Display
 * Shows uploaded files with remove option
 */
interface FileDisplayProps {
    files: UploadedFile[];
    onRemove?: (id: string) => void;
    className?: string;
}

export function UploadedFilesDisplay({ files, onRemove, className }: FileDisplayProps) {
    if (files.length === 0) return null;

    return (
        <div className={cn("flex flex-wrap gap-2 mb-3", className)}>
            {files.map(file => (
                <div
                    key={file.id}
                    className="flex items-center gap-2 bg-primary/10 rounded-md px-3 py-2 text-xs"
                >
                    {file.type.startsWith('image/') ? (
                        <ImageIcon className="h-3 w-3" />
                    ) : (
                        <Paperclip className="h-3 w-3" />
                    )}
                    <span className="max-w-[150px] truncate">{file.name}</span>
                    {onRemove && (
                        <button
                            onClick={() => onRemove(file.id)}
                            className="ml-1 hover:text-destructive"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
}

/**
 * Voice Input Indicator
 * Shows real-time transcription while listening
 */
interface VoiceIndicatorProps {
    isListening: boolean;
    transcript: string;
    className?: string;
}

export function VoiceInputIndicator({ isListening, transcript, className }: VoiceIndicatorProps) {
    if (!isListening || !transcript) return null;

    return (
        <div className={cn(
            "mb-3 p-2 bg-red-50 dark:bg-red-950/20 rounded-md text-xs text-red-700 dark:text-red-400",
            className
        )}>
            <div className="flex items-center gap-2">
                <Mic className="h-3 w-3 animate-pulse" />
                <span>Listening... &quot;{transcript}&quot;</span>
            </div>
        </div>
    );
}
