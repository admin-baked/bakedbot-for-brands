/**
 * Discovery Browser Status API
 * 
 * Returns the status of browser automation capabilities.
 * Restricted to Super Users.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRTRVRClient, isRTRVRAvailable } from '@/server/services/rtrvr';
import { getCredits, listDevices } from '@/server/services/rtrvr/mcp';

export async function GET(request: NextRequest) {
    try {
        const isAvailable = isRTRVRAvailable();
        
        if (!isAvailable) {
            return NextResponse.json({
                isAvailable: false,
                devices: [],
                credits: null,
            });
        }

        // Fetch devices and credits in parallel
        const [devicesResult, creditsResult] = await Promise.all([
            listDevices(),
            getCredits(),
        ]);

        // Parse devices
        let devices: Array<{ id: string; name: string; online: boolean }> = [];
        if (devicesResult.success && devicesResult.data?.result) {
            const rawDevices = devicesResult.data.result as Array<{
                device_id?: string;
                id?: string;
                name?: string;
                online?: boolean;
            }>;
            devices = rawDevices.map(d => ({
                id: d.device_id || d.id || '',
                name: d.name || 'Unknown Device',
                online: d.online ?? false,
            }));
        }

        // Parse credits
        let credits: { used: number; remaining: number; plan: string } | null = null;
        if (creditsResult.success && creditsResult.data?.result) {
            const raw = creditsResult.data.result as {
                credits_used?: number;
                credits_remaining?: number;
                plan?: string;
            };
            credits = {
                used: raw.credits_used || 0,
                remaining: raw.credits_remaining || 0,
                plan: raw.plan || 'Unknown',
            };
        }

        return NextResponse.json({
            isAvailable: true,
            devices,
            credits,
        });
    } catch (error) {
        console.error('[Discovery Status] Error:', error);
        return NextResponse.json({
            isAvailable: false,
            devices: [],
            credits: null,
            error: 'Failed to fetch status',
        }, { status: 500 });
    }
}
