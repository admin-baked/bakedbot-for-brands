'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2, X } from 'lucide-react';

interface AudioRecorderProps {
    onRecordingComplete: (audioBlob: Blob) => void;
    onCancel?: () => void;
    isProcessing?: boolean;
}

export function AudioRecorder({ onRecordingComplete, onCancel, isProcessing }: AudioRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                onRecordingComplete(blob);
                
                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            
            // Start Timer
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('Could not access microphone. Please check permissions.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const cancelRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            // Stop recorder but don't emit
            mediaRecorderRef.current.stop();
            // Important: Override onstop to do nothing or handle cancel logic differently if needed
            // But here we just want to reset state
            mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
        }
        setIsRecording(false);
        setRecordingTime(0);
        chunksRef.current = [];
        if (timerRef.current) clearInterval(timerRef.current);
        onCancel?.();
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
        };
    }, []);

    if (isProcessing) {
        return (
            <div className="flex items-center gap-2 px-3 py-2 bg-muted/20 rounded-full animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                <span className="text-xs font-medium text-emerald-600">Transcribing...</span>
            </div>
        );
    }

    if (!isRecording) {
        return (
            <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors"
                onClick={startRecording}
                title="Start Voice Recording"
            >
                <Mic className="h-4 w-4" />
            </Button>
        );
    }

    // Active Recording State
    return (
        <div className="flex items-center gap-2 px-2 py-1 bg-red-50 border border-red-100 rounded-full">
            <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-mono w-[40px] text-red-600">
                {formatTime(recordingTime)}
            </span>
            <Button 
                size="icon" 
                variant="ghost" 
                className="h-6 w-6 rounded-full bg-red-500 text-white hover:bg-red-600 ml-1"
                onClick={stopRecording}
            >
                <Square className="h-3 w-3 fill-current" />
            </Button>
            <Button 
                size="icon" 
                variant="ghost" 
                className="h-6 w-6 rounded-full text-slate-400 hover:text-slate-600"
                onClick={cancelRecording}
            >
                <X className="h-3 w-3" />
            </Button>
        </div>
    );
}

function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}
