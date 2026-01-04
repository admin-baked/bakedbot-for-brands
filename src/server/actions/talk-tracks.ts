'use server';

import { getAllTalkTracks, saveTalkTrack } from '@/server/repos/talkTrackRepo';
import { TalkTrack } from '@/types/talk-track';
import { revalidateTag } from 'next/cache';

export async function getTalkTracksAction() {
    try {
        const tracks = await getAllTalkTracks();
        return { success: true, data: tracks };
    } catch (error) {
        console.error('Failed to fetch talk tracks', error);
        return { success: false, error: 'Failed to fetch tracks' };
    }
}

export async function saveTalkTrackAction(track: TalkTrack) {
    try {
        await saveTalkTrack(track);
        revalidateTag('talk-tracks');
        return { success: true };
    } catch (error) {
        console.error('Failed to save talk track', error);
        return { success: false, error: 'Failed to save track' };
    }
}
