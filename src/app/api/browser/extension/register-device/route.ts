/**
 * Chrome Extension Device Registration API
 *
 * Registers the Chrome extension device for browser automation.
 * Called by the extension after successful authentication to enable
 * RTRVR MCP integration.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';
import { isSuperAdminEmail } from '@/lib/super-admin-config';

const EXTENSION_DEVICES_COLLECTION = 'extension_devices';

export interface ExtensionDevice {
  userId: string;
  deviceId: string;
  deviceName: string;
  fcmToken?: string;
  userAgent: string;
  registeredAt: Timestamp;
  lastSeenAt: Timestamp;
  online: boolean;
}

/**
 * POST /api/browser/extension/register-device
 *
 * Register a device for browser automation.
 * The extension calls this after authentication to register itself.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, deviceId, deviceName, fcmToken, userAgent } = body;

    if (!userId || !deviceId) {
      return NextResponse.json(
        { success: false, error: 'userId and deviceId are required' },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();

    // Verify user exists and is a Super User
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    if (!isSuperAdminEmail(userData?.email)) {
      return NextResponse.json(
        { success: false, error: 'Super User access required' },
        { status: 403 }
      );
    }

    const now = Timestamp.now();

    // Upsert device registration
    const deviceRef = db.collection(EXTENSION_DEVICES_COLLECTION).doc(deviceId);
    const existingDevice = await deviceRef.get();

    if (existingDevice.exists) {
      // Update existing device
      await deviceRef.update({
        userId,
        deviceName: deviceName || existingDevice.data()?.deviceName || 'Chrome Browser',
        fcmToken: fcmToken || existingDevice.data()?.fcmToken,
        userAgent: userAgent || existingDevice.data()?.userAgent,
        lastSeenAt: now,
        online: true,
      });

      logger.info('[Extension Device] Updated device registration', {
        deviceId,
        userId,
      });
    } else {
      // Create new device
      const device: ExtensionDevice = {
        userId,
        deviceId,
        deviceName: deviceName || 'Chrome Browser',
        fcmToken,
        userAgent: userAgent || '',
        registeredAt: now,
        lastSeenAt: now,
        online: true,
      };

      await deviceRef.set(device);

      logger.info('[Extension Device] Registered new device', {
        deviceId,
        userId,
      });
    }

    // Also update user document with extension status
    await db.collection('users').doc(userId).update({
      extensionConnected: true,
      extensionDeviceId: deviceId,
      extensionLastSeen: now,
    });

    return NextResponse.json({
      success: true,
      deviceId,
      message: 'Device registered successfully',
    });
  } catch (error) {
    logger.error('[Extension Device] Registration error:', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { success: false, error: 'Failed to register device' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/browser/extension/register-device
 *
 * Get registered devices for a user.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    const snapshot = await db
      .collection(EXTENSION_DEVICES_COLLECTION)
      .where('userId', '==', userId)
      .get();

    const devices = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Mark stale devices as offline (no heartbeat in 5 minutes)
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    for (const device of devices) {
      const lastSeen = (device as any).lastSeenAt?.toMillis?.() || 0;
      if (lastSeen < fiveMinutesAgo && (device as any).online) {
        await db.collection(EXTENSION_DEVICES_COLLECTION).doc(device.id).update({
          online: false,
        });
        (device as any).online = false;
      }
    }

    return NextResponse.json({
      success: true,
      devices,
      deviceCount: devices.length,
    });
  } catch (error) {
    logger.error('[Extension Device] Get devices error:', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { success: false, error: 'Failed to get devices' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/browser/extension/register-device
 *
 * Heartbeat endpoint to keep device online status updated.
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { deviceId } = body;

    if (!deviceId) {
      return NextResponse.json(
        { success: false, error: 'deviceId is required' },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    const deviceRef = db.collection(EXTENSION_DEVICES_COLLECTION).doc(deviceId);
    const device = await deviceRef.get();

    if (!device.exists) {
      return NextResponse.json(
        { success: false, error: 'Device not found' },
        { status: 404 }
      );
    }

    await deviceRef.update({
      lastSeenAt: Timestamp.now(),
      online: true,
    });

    return NextResponse.json({
      success: true,
      message: 'Heartbeat received',
    });
  } catch (error) {
    logger.error('[Extension Device] Heartbeat error:', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { success: false, error: 'Failed to update heartbeat' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/browser/extension/register-device
 *
 * Unregister a device.
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');

    if (!deviceId) {
      return NextResponse.json(
        { success: false, error: 'deviceId is required' },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    await db.collection(EXTENSION_DEVICES_COLLECTION).doc(deviceId).delete();

    logger.info('[Extension Device] Unregistered device', { deviceId });

    return NextResponse.json({
      success: true,
      message: 'Device unregistered',
    });
  } catch (error) {
    logger.error('[Extension Device] Unregister error:', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { success: false, error: 'Failed to unregister device' },
      { status: 500 }
    );
  }
}
