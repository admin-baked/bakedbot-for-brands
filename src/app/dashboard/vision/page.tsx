// EMERGENCY BUILD FIX: Force dynamic rendering to prevent OOM during build
// With 204 pages, pre-rendering all at once requires >64GB memory
// This line forces on-demand generation instead
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
    Video, VideoOff, Camera, Eye, Users, Clock, TrendingUp,
    AlertTriangle, CheckCircle2, Maximize2, Minimize2, Settings,
    Play, Pause, Mic, MicOff, Volume2, VolumeX, RotateCcw,
    Flame, MapPin, Activity, Zap, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock real-time data
const MOCK_CAMERAS = [
    { id: 'cam-1', name: 'Main Floor', location: 'floor', status: 'online', occupancy: 12, avgDwell: 4.2 },
    { id: 'cam-2', name: 'Entrance', location: 'entrance', status: 'online', occupancy: 3, avgDwell: 0.5 },
    { id: 'cam-3', name: 'Checkout Area', location: 'checkout', status: 'online', occupancy: 5, avgDwell: 2.8, queueLength: 3 },
    { id: 'cam-4', name: 'Consultation Room', location: 'consultation', status: 'offline', occupancy: 0, avgDwell: 0 },
];

const MOCK_LIVE_STATS = {
    totalVisitors: 24,
    currentOccupancy: 18,
    avgDwellTime: '3.5 min',
    queueWaitTime: '2.1 min',
    peakToday: 32,
    peakTime: '2:30 PM',
    staffOnFloor: 4,
    conversionRate: 78,
};

const MOCK_HOTSPOTS = [
    { zone: 'Flower Wall', intensity: 95, dwell: '5.2 min' },
    { zone: 'Pre-rolls', intensity: 82, dwell: '3.8 min' },
    { zone: 'Edibles', intensity: 67, dwell: '2.4 min' },
    { zone: 'Concentrates', intensity: 45, dwell: '1.9 min' },
];

const MOCK_ALERTS = [
    { id: '1', type: 'info', message: 'Peak traffic expected in 30 minutes', time: '2 min ago' },
    { id: '2', type: 'warning', message: 'Queue at checkout reaching threshold', time: '5 min ago' },
];

function LiveCameraView({ cameraId, cameraName }: { cameraId: string; cameraName: string }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [showOverlay, setShowOverlay] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const startStream = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: 1280, height: 720 },
                audio: false
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setIsStreaming(true);
                setHasPermission(true);
            }
        } catch (err) {
            console.error('Camera access denied:', err);
            setHasPermission(false);
        }
    };

    const stopStream = () => {
        if (videoRef.current?.srcObject) {
            const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
            tracks.forEach(track => track.stop());
            videoRef.current.srcObject = null;
            setIsStreaming(false);
        }
    };

    return (
        <div className={cn("relative bg-black rounded-lg overflow-hidden", isFullscreen ? "fixed inset-0 z-50" : "aspect-video")}>
            {/* Video Element */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
            />

            {/* No Stream Placeholder */}
            {!isStreaming && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-white">
                    <Video className="h-12 w-12 mb-4 text-slate-500" />
                    <p className="text-slate-400 mb-4">Camera not active</p>
                    <Button onClick={startStream} className="gap-2">
                        <Play className="h-4 w-4" />
                        Start Live View
                    </Button>
                    {hasPermission === false && (
                        <p className="text-red-400 text-sm mt-4">Camera access denied. Please enable in browser settings.</p>
                    )}
                </div>
            )}

            {/* Live Overlay */}
            {isStreaming && showOverlay && (
                <>
                    {/* Top bar */}
                    <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/70 to-transparent">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                                    <span className="text-white text-sm font-medium">LIVE</span>
                                </span>
                                <Badge variant="secondary" className="text-xs">{cameraName}</Badge>
                            </div>
                            <div className="flex items-center gap-2 text-white text-xs" suppressHydrationWarning>
                                <Clock className="h-3 w-3" />
                                {new Date().toLocaleTimeString()}
                            </div>
                        </div>
                    </div>

                    {/* Right side stats */}
                    <div className="absolute top-12 right-3 space-y-2">
                        <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 text-white">
                            <div className="flex items-center gap-2 text-xs text-slate-300">
                                <Users className="h-3 w-3" />
                                <span>In View</span>
                            </div>
                            <p className="text-xl font-bold">12</p>
                        </div>
                        <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 text-white">
                            <div className="flex items-center gap-2 text-xs text-slate-300">
                                <Clock className="h-3 w-3" />
                                <span>Avg Dwell</span>
                            </div>
                            <p className="text-xl font-bold">3.5m</p>
                        </div>
                    </div>

                    {/* Bottom controls */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/20" onClick={stopStream}>
                                    <Pause className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/20" onClick={() => setShowOverlay(!showOverlay)}>
                                    {showOverlay ? <Eye className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                                </Button>
                            </div>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/20" onClick={() => setIsFullscreen(!isFullscreen)}>
                                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

function CameraThumbnail({ camera, isSelected, onClick }: {
    camera: typeof MOCK_CAMERAS[0];
    isSelected: boolean;
    onClick: () => void;
}) {
    return (
        <div
            className={cn(
                "relative aspect-video rounded-lg overflow-hidden cursor-pointer transition-all",
                isSelected ? "ring-2 ring-primary" : "hover:ring-1 hover:ring-primary/50"
            )}
            onClick={onClick}
        >
            <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
                <Camera className="h-6 w-6 text-slate-500" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                <div className="flex items-center justify-between">
                    <span className="text-white text-xs font-medium truncate">{camera.name}</span>
                    <Badge variant={camera.status === 'online' ? 'default' : 'secondary'} className="text-[10px] h-4">
                        {camera.status}
                    </Badge>
                </div>
            </div>
            {camera.status === 'online' && (
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-green-500" />
            )}
        </div>
    );
}

export default function VisionPage() {
    const [selectedCamera, setSelectedCamera] = useState(MOCK_CAMERAS[0]);
    const [showHeatmap, setShowHeatmap] = useState(false);

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Eye className="h-6 w-6 text-primary" />
                        Smokey Vision
                    </h1>
                    <p className="text-muted-foreground">Real-time operations monitoring and analytics</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Switch id="heatmap" checked={showHeatmap} onCheckedChange={setShowHeatmap} />
                        <Label htmlFor="heatmap" className="text-sm">Heatmap Overlay</Label>
                    </div>
                    <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4 mr-2" />
                        Configure
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Main Camera View */}
                <div className="lg:col-span-3 space-y-4">
                    <LiveCameraView cameraId={selectedCamera.id} cameraName={selectedCamera.name} />

                    {/* Camera Thumbnails */}
                    <div className="grid grid-cols-4 gap-3">
                        {MOCK_CAMERAS.map((camera) => (
                            <CameraThumbnail
                                key={camera.id}
                                camera={camera}
                                isSelected={selectedCamera.id === camera.id}
                                onClick={() => setSelectedCamera(camera)}
                            />
                        ))}
                    </div>
                </div>

                {/* Right Sidebar - Live Stats */}
                <div className="space-y-4">
                    {/* Current Stats */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Activity className="h-4 w-4 text-primary" />
                                Live Stats
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-muted/50 rounded-lg p-3">
                                    <p className="text-xs text-muted-foreground">Current</p>
                                    <p className="text-2xl font-bold">{MOCK_LIVE_STATS.currentOccupancy}</p>
                                    <p className="text-xs text-muted-foreground">in store</p>
                                </div>
                                <div className="bg-muted/50 rounded-lg p-3">
                                    <p className="text-xs text-muted-foreground">Today</p>
                                    <p className="text-2xl font-bold">{MOCK_LIVE_STATS.totalVisitors}</p>
                                    <p className="text-xs text-muted-foreground">visitors</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Avg Dwell</span>
                                    <span className="font-medium">{MOCK_LIVE_STATS.avgDwellTime}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Queue Wait</span>
                                    <span className="font-medium">{MOCK_LIVE_STATS.queueWaitTime}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Conversion</span>
                                    <span className="font-medium text-green-600">{MOCK_LIVE_STATS.conversionRate}%</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Staff on Floor</span>
                                    <span className="font-medium">{MOCK_LIVE_STATS.staffOnFloor}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Hotspots */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Flame className="h-4 w-4 text-orange-500" />
                                Current Hotspots
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {MOCK_HOTSPOTS.map((spot, i) => (
                                <div key={spot.zone} className="space-y-1">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-medium">{spot.zone}</span>
                                        <span className="text-xs text-muted-foreground">{spot.dwell}</span>
                                    </div>
                                    <Progress value={spot.intensity} className="h-1.5" />
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Alerts */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Zap className="h-4 w-4 text-yellow-500" />
                                Alerts
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {MOCK_ALERTS.map((alert) => (
                                <div key={alert.id} className={cn(
                                    "p-2 rounded-lg text-sm",
                                    alert.type === 'warning' ? 'bg-yellow-50 text-yellow-800' : 'bg-blue-50 text-blue-800'
                                )}>
                                    <p className="font-medium">{alert.message}</p>
                                    <p className="text-xs opacity-70">{alert.time}</p>
                                </div>
                            ))}
                            {MOCK_ALERTS.length === 0 && (
                                <div className="flex items-center gap-2 text-sm text-green-600">
                                    <CheckCircle2 className="h-4 w-4" />
                                    All clear - no alerts
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
