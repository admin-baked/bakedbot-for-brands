/**
 * Smokey Vision - AI Computer Vision System
 * Camera-based analytics for dispensaries and brands
 */

// ============================================
// CAMERA & DEVICE MANAGEMENT
// ============================================

export type DeviceType = 'phone' | 'tablet' | 'laptop' | 'webcam' | 'security_camera' | 'ip_camera';
export type CameraLocation = 'floor' | 'entrance' | 'checkout' | 'back_office' | 'storage' | 'grow_room' | 'processing' | 'custom';
export type CameraStatus = 'online' | 'offline' | 'streaming' | 'recording' | 'analyzing' | 'error';

export interface VisionCamera {
    id: string;
    name: string;
    deviceType: DeviceType;
    location: CameraLocation;
    customLocation?: string;

    // Device info
    deviceId?: string;
    userAgent?: string;
    resolution: { width: number; height: number };
    fps: number;

    // Status
    status: CameraStatus;
    lastActiveAt?: Date;
    streamUrl?: string;

    // Settings
    enableMotionDetection: boolean;
    enablePeopleTracking: boolean;
    enableHeatmaps: boolean;
    enableProductRecognition: boolean;

    // Schedule
    activeHours?: {
        start: string; // "09:00"
        end: string;   // "21:00"
    };
    activeDays?: number[]; // 0-6

    // Metadata
    createdAt: Date;
    updatedAt: Date;
    orgId: string;
}

// ============================================
// ANALYTICS & INSIGHTS
// ============================================

export type AnalyticsType =
    | 'traffic_count'
    | 'heatmap'
    | 'dwell_time'
    | 'path_analysis'
    | 'queue_detection'
    | 'product_interaction'
    | 'staff_tracking'
    | 'safety_compliance'
    | 'grow_monitoring';

export interface TrafficAnalytics {
    cameraId: string;
    period: 'hour' | 'day' | 'week' | 'month';
    timestamp: Date;

    // Counts
    entrances: number;
    exits: number;
    peakCount: number;
    avgOccupancy: number;

    // Flow
    hourlyBreakdown: { hour: number; count: number }[];
    conversionRate?: number; // Entered checkout zone vs total
}

export interface HeatmapData {
    cameraId: string;
    generatedAt: Date;
    period: 'hour' | 'day' | 'week';

    // Grid data
    gridWidth: number;
    gridHeight: number;
    cells: {
        x: number;
        y: number;
        intensity: number; // 0-100
        avgDwellSeconds: number;
    }[];

    // Zones
    hotspots: {
        zone: string;
        intensity: number;
        avgDwell: number;
    }[];
    coldspots: {
        zone: string;
        intensity: number;
    }[];
}

export interface DwellTimeAnalysis {
    cameraId: string;
    zone: string;
    period: Date;

    avgDwellSeconds: number;
    medianDwellSeconds: number;
    maxDwellSeconds: number;
    totalVisitors: number;

    // Breakdown
    dwellDistribution: {
        range: string; // "0-30s", "30-60s", etc.
        count: number;
        percentage: number;
    }[];
}

export interface PathAnalysis {
    cameraId: string;
    period: Date;

    // Common paths
    paths: {
        sequence: string[]; // Zone names in order
        count: number;
        avgDuration: number;
        conversionRate: number;
    }[];

    // Entry/exit points
    entryPoints: { location: string; count: number }[];
    exitPoints: { location: string; count: number }[];
}

export interface QueueAnalytics {
    cameraId: string;
    zone: string; // e.g., "checkout"
    timestamp: Date;

    currentLength: number;
    avgWaitTime: number;
    maxWaitTime: number;
    abandonmentRate: number;

    hourlyBreakdown: {
        hour: number;
        avgLength: number;
        avgWait: number;
    }[];
}

// ============================================
// GROW ROOM MONITORING (Brands)
// ============================================

export interface GrowRoomAnalytics {
    cameraId: string;
    roomName: string;
    timestamp: Date;

    // Plant health (AI detected)
    plantCount: number;
    healthScore: number; // 0-100

    // Issues detected
    issues: {
        type: 'pest' | 'nutrient_deficiency' | 'overwatering' | 'light_stress' | 'mold' | 'other';
        severity: 'low' | 'medium' | 'high';
        location: { x: number; y: number };
        description: string;
        detectedAt: Date;
    }[];

    // Environment (from vision analysis)
    estimatedCoverage: number; // Canopy coverage %
    growthStage?: 'seedling' | 'vegetative' | 'flowering' | 'harvest';
}

// ============================================
// ZONES & FLOOR MAPPING
// ============================================

export interface FloorZone {
    id: string;
    name: string;
    type: 'entrance' | 'flower' | 'edibles' | 'concentrates' | 'checkout' | 'waiting' | 'consultation' | 'custom';

    // Polygon coordinates (relative to camera view)
    coordinates: { x: number; y: number }[];

    // Linked data
    linkedProductCategories?: string[];
    linkedStaffPositions?: string[];

    // Analytics config
    trackDwellTime: boolean;
    trackQueue: boolean;
    alertOnCrowding: boolean;
    crowdingThreshold?: number;

    createdAt: Date;
    orgId: string;
}

export interface FloorPlan {
    id: string;
    name: string;
    locationId: string;

    // Floor plan image
    imageUrl?: string;
    width: number;
    height: number;

    // Mapped zones
    zones: FloorZone[];

    // Camera positions
    cameraPositions: {
        cameraId: string;
        x: number;
        y: number;
        rotation: number;
        fov: number; // Field of view in degrees
    }[];

    createdAt: Date;
    updatedAt: Date;
    orgId: string;
}

// ============================================
// AI RECOMMENDATIONS
// ============================================

export type RecommendationType =
    | 'merchandising'
    | 'staffing'
    | 'layout'
    | 'product_placement'
    | 'signage'
    | 'grow_optimization'
    | 'operations';

export interface VisionRecommendation {
    id: string;
    type: RecommendationType;
    priority: 'low' | 'medium' | 'high' | 'critical';

    title: string;
    description: string;
    rationale: string;

    // Supporting data
    dataPoints: {
        metric: string;
        value: number | string;
        comparison?: string;
    }[];

    // Actions
    suggestedActions: string[];
    estimatedImpact: string;

    // Status
    status: 'new' | 'acknowledged' | 'in_progress' | 'completed' | 'dismissed';
    assignedTo?: string;

    // Source
    sourceAnalytics: AnalyticsType[];
    cameraIds: string[];

    createdAt: Date;
    updatedAt: Date;
    orgId: string;
}

// ============================================
// ALERTS & NOTIFICATIONS
// ============================================

export type VisionAlertType =
    | 'crowding'
    | 'long_queue'
    | 'unusual_activity'
    | 'zone_empty'
    | 'staffing_needed'
    | 'plant_issue'
    | 'compliance';

export interface VisionAlert {
    id: string;
    type: VisionAlertType;
    severity: 'info' | 'warning' | 'critical';

    title: string;
    message: string;

    // Location
    cameraId: string;
    zoneId?: string;

    // Media
    snapshotUrl?: string;
    clipUrl?: string;

    // Status
    acknowledged: boolean;
    acknowledgedBy?: string;
    acknowledgedAt?: Date;

    createdAt: Date;
    orgId: string;
}

// ============================================
// VISION SESSION (Active Streaming)
// ============================================

export interface VisionSession {
    id: string;
    cameraId: string;

    // Session info
    startedAt: Date;
    endedAt?: Date;
    duration?: number;

    // Processing
    framesProcessed: number;
    detections: number;

    // Real-time stats
    currentOccupancy: number;
    activeZones: string[];

    // Recording
    isRecording: boolean;
    recordingUrl?: string;

    orgId: string;
}

// ============================================
// CONFIGURATION
// ============================================

export interface VisionConfig {
    orgId: string;

    // Features
    enableTrafficAnalytics: boolean;
    enableHeatmaps: boolean;
    enablePathAnalysis: boolean;
    enableProductRecognition: boolean;
    enableGrowMonitoring: boolean;

    // Privacy
    blurFaces: boolean;
    retentionDays: number;

    // Alerts
    alertChannels: ('email' | 'sms' | 'dashboard')[];
    alertRecipients: string[];

    // Processing
    processingQuality: 'low' | 'medium' | 'high';
    snapshotInterval: number; // seconds

    createdAt: Date;
    updatedAt: Date;
}

// ============================================
// AGENT CONTEXT INTEGRATION
// ============================================

export interface VisionContext {
    orgId: string;
    locationId: string;

    // Latest metrics for agent context
    currentMetrics: {
        occupancy: number;
        busiestZone: string;
        avgDwellTime: number;
        queueLength: number;
        staffOnFloor: number;
    };

    // Recent insights
    recentInsights: {
        insight: string;
        confidence: number;
        timestamp: Date;
    }[];

    // Layout context
    floorDescription: string;
    zoneDescriptions: Record<string, string>;

    lastUpdated: Date;
}
