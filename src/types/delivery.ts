/**
 * Delivery System Type Definitions
 *
 * Comprehensive types for NY OCM-compliant cannabis delivery system
 * Includes: Driver Management, Delivery Tracking, Zone Configuration, Route Optimization
 */

import { Timestamp } from '@google-cloud/firestore';
import { ShippingAddress } from './orders';

// ===========================
// Driver Management Types
// ===========================

export type DriverStatus = 'active' | 'inactive' | 'suspended';
export type VehicleType = 'car' | 'van' | 'bike' | 'scooter' | 'foot';

export interface GPSLocation {
    lat: number;
    lng: number;
    updatedAt: Timestamp;
}

export interface Driver {
    id: string; // driver_<uuid>
    userId: string; // links to users collection
    orgId: string; // org_thrive_syracuse

    // Personal Info
    firstName: string;
    lastName: string;
    phone: string;
    email: string;

    // License Info (NY OCM Requirement: 21+ with valid license)
    licenseNumber: string;
    licenseState: string;
    licenseExpiry: Timestamp;
    birthDate?: string; // YYYY-MM-DD for age verification

    // Vehicle Info (NY OCM Requirement: Vehicle details must be recorded)
    vehicleType: VehicleType;
    vehicleMake?: string; // Required for car/van
    vehicleModel?: string; // Required for car/van
    vehicleYear?: number; // Required for car/van
    vehiclePlate?: string; // Required for car/van

    // Status
    status: DriverStatus;
    isAvailable: boolean; // On/off duty toggle
    currentLocation?: GPSLocation; // Real-time GPS (updated every 30s)

    // Timestamps
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// Driver creation input (for forms)
export interface CreateDriverInput {
    userId?: string; // Optional - can be created during driver signup
    orgId: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    licenseNumber: string;
    licenseState: string;
    licenseExpiry: Date;
    birthDate?: string;
    vehicleType: VehicleType;
    vehicleMake?: string;
    vehicleModel?: string;
    vehicleYear?: number;
    vehiclePlate?: string;
}

// Driver update input (for edits)
export interface UpdateDriverInput {
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    licenseNumber?: string;
    licenseState?: string;
    licenseExpiry?: Date;
    vehicleType?: VehicleType;
    vehicleMake?: string;
    vehicleModel?: string;
    vehicleYear?: number;
    vehiclePlate?: string;
    status?: DriverStatus;
    isAvailable?: boolean;
}

// ===========================
// Delivery Management Types
// ===========================

export type DeliveryStatus =
    | 'pending'        // Created, awaiting driver assignment
    | 'assigned'       // Driver assigned, not yet departed
    | 'in_transit'     // Driver en route to customer
    | 'arrived'        // Driver at customer location
    | 'delivered'      // Completed successfully
    | 'failed';        // Failed delivery attempt

export type IDType = 'drivers_license' | 'state_id' | 'passport';

export interface DeliveryWindow {
    start: Timestamp;
    end: Timestamp;
    type: 'asap' | 'scheduled';
}

// NY OCM Requirement: ID verification at delivery point
export interface IDVerification {
    verified: boolean;
    verifiedAt?: Timestamp;
    idType?: IDType;
    idNumber?: string; // Last 4 digits only (PII protection)
    birthDate?: string; // YYYY-MM-DD (21+ verification)
    photoUrl?: string; // Firebase Storage URL for ID photo
}

export interface DeliveryAddress extends ShippingAddress {
    lat?: number; // Geocoded latitude
    lng?: number; // Geocoded longitude
    phone?: string; // Customer contact number
    deliveryInstructions?: string; // Gate code, apt number, etc.
}

export interface Delivery {
    id: string; // del_<uuid>
    orderId: string; // links to orders collection
    locationId: string; // dispensary location (e.g., loc_thrive_syracuse)
    driverId?: string; // assigned driver ID
    status: DeliveryStatus;

    // Delivery Details
    deliveryAddress: DeliveryAddress;
    deliveryWindow: DeliveryWindow;
    deliveryFee: number; // $5, $8, $12 based on zone
    zoneId: string; // zone_downtown, zone_suburbs, zone_extended
    deliveryInstructions?: string; // Convenience field (also in deliveryAddress)

    // NY OCM Compliance Requirements
    idVerification: IDVerification;
    signatureUrl?: string; // Firebase Storage URL for signature image
    proofOfDeliveryPhoto?: string; // Firebase Storage URL for delivery photo

    // GPS Tracking (NY OCM Requirement: GPS tracking of delivery vehicles)
    estimatedArrival?: Timestamp;
    actualArrival?: Timestamp;
    driverLocation?: GPSLocation; // Updated every 30 seconds
    route?: any; // google.maps.DirectionsResult - full route data
    distanceMiles?: number;

    // OCM Compliance Documentation
    manifestNumber?: string; // Unique manifest ID for OCM reporting
    manifestTransmittedAt?: Timestamp; // When manifest sent to OCM

    // Timestamps
    assignedAt?: Timestamp; // When driver was assigned
    departedAt?: Timestamp; // When driver left dispensary
    arrivedAt?: Timestamp; // When driver arrived at customer
    deliveredAt?: Timestamp; // When delivery completed
    failedAt?: Timestamp; // When delivery failed
    failureReason?: string; // Reason for failure (customer unavailable, wrong address, etc.)
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// Delivery creation input
export interface CreateDeliveryInput {
    orderId: string;
    locationId: string;
    deliveryAddress: DeliveryAddress;
    deliveryWindow: DeliveryWindow;
    deliveryFee: number;
    zoneId: string;
}

// Delivery status update input
export interface UpdateDeliveryStatusInput {
    deliveryId: string;
    status: DeliveryStatus;
    driverLocation?: GPSLocation;
    estimatedArrival?: Timestamp;
    failureReason?: string;
}

// ===========================
// Delivery Zone Types
// ===========================

export interface DeliveryZone {
    id: string; // zone_<uuid>
    locationId: string; // parent location
    name: string; // "Downtown Syracuse", "Syracuse Suburbs", "Extended Area"
    radiusMiles: number; // 5, 10, 15
    baseFee: number; // $5.00, $8.00, $12.00
    minimumOrder: number; // $30.00, $50.00, $75.00
    isActive: boolean;
    polygon?: any; // GeoJSON polygon for custom boundaries (future enhancement)
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// Zone creation input
export interface CreateZoneInput {
    locationId: string;
    name: string;
    radiusMiles: number;
    baseFee: number;
    minimumOrder: number;
    isActive?: boolean;
}

// Zone update input
export interface UpdateZoneInput {
    name?: string;
    radiusMiles?: number;
    baseFee?: number;
    minimumOrder?: number;
    isActive?: boolean;
}

// Fee calculation result
export interface FeeCalculation {
    zone: DeliveryZone;
    deliveryFee: number;
    minimumOrder: number;
    meetsMinimum: boolean;
    estimatedTime: string; // "45-60 min"
    distance?: number; // miles from dispensary
}

// ===========================
// Route Optimization Types
// ===========================

export type RouteStatus = 'planned' | 'active' | 'completed';

export interface DeliveryRoute {
    id: string; // route_<uuid>
    driverId: string;
    locationId: string;
    deliveryIds: string[]; // Array of delivery IDs
    status: RouteStatus;
    sequence: number[]; // Optimal order of deliveries (indexes into deliveryIds)
    totalDistance: number; // Total route miles
    estimatedDuration: number; // Total route minutes
    createdAt: Timestamp;
    startedAt?: Timestamp;
    completedAt?: Timestamp;
}

// Route creation input
export interface CreateRouteInput {
    driverId: string;
    locationId: string;
    deliveryIds: string[];
}

// ===========================
// Location Configuration
// ===========================

export interface DeliveryConfig {
    enabled: boolean; // Is delivery enabled for this location?
    maxDeliveriesPerRoute: number; // Max stops per driver route (default: 5)
    estimatedPrepTime: number; // Minutes to prepare order (default: 30)
    operatingHours: {
        [day: string]: { start: string; end: string }; // e.g., { "monday": { "start": "10:00", "end": "20:00" } }
    };
}

// Default Thrive Syracuse delivery config
export const DEFAULT_DELIVERY_CONFIG: DeliveryConfig = {
    enabled: true,
    maxDeliveriesPerRoute: 5,
    estimatedPrepTime: 30,
    operatingHours: {
        monday: { start: '10:00', end: '20:00' },
        tuesday: { start: '10:00', end: '20:00' },
        wednesday: { start: '10:00', end: '20:00' },
        thursday: { start: '10:00', end: '20:00' },
        friday: { start: '10:00', end: '20:00' },
        saturday: { start: '10:00', end: '20:00' },
        sunday: { start: '11:00', end: '18:00' },
    },
};

// Default Thrive Syracuse delivery zones
export const DEFAULT_DELIVERY_ZONES: Omit<DeliveryZone, 'id' | 'locationId' | 'createdAt' | 'updatedAt'>[] = [
    {
        name: 'Downtown Syracuse',
        radiusMiles: 5,
        baseFee: 5.00,
        minimumOrder: 30.00,
        isActive: true,
    },
    {
        name: 'Syracuse Suburbs',
        radiusMiles: 10,
        baseFee: 8.00,
        minimumOrder: 50.00,
        isActive: true,
    },
    {
        name: 'Extended Area',
        radiusMiles: 15,
        baseFee: 12.00,
        minimumOrder: 75.00,
        isActive: true,
    },
];

// ===========================
// Compliance & Audit Types
// ===========================

export type ComplianceEventType =
    | 'manifest_created'
    | 'manifest_transmitted'
    | 'id_verified'
    | 'signature_captured'
    | 'delivered';

export interface ComplianceLog {
    id: string;
    deliveryId: string;
    eventType: ComplianceEventType;
    timestamp: Timestamp;
    data: any; // Event-specific payload
    performedBy: string; // userId or 'system'
}

// ===========================
// Dashboard Analytics Types
// ===========================

export interface DeliveryStats {
    total: number;
    pending: number;
    assigned: number;
    inTransit: number;
    delivered: number;
    failed: number;
    successRate: number; // Percentage
    avgDeliveryTime: number; // Minutes
    onTimePercentage: number; // Percentage within delivery window
}

export interface DriverPerformance {
    driverId: string;
    driverName: string;
    totalDeliveries: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    successRate: number;
    avgDeliveryTime: number; // Minutes
    avgRating?: number; // Customer ratings (future)
}

export interface ZonePerformance {
    zoneId: string;
    zoneName: string;
    totalDeliveries: number;
    revenue: number;
    avgDeliveryTime: number;
    popularityScore: number; // Relative demand
}
