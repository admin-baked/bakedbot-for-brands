import { getLoyaltyProfile } from '@/server/services/alpine-iq';
import { blackleafService } from '@/lib/notifications/blackleaf-service';

export const LoyaltyTools = {
    checkPoints: async (phone: string) => {
        const profile = await getLoyaltyProfile(phone);
        if (!profile) throw new Error('Customer not found');
        return {
            points: profile.points,
            tier: profile.tier,
            lastVisit: profile.lastVisit
        };
    },

    sendSms: async (phone: string, message: string) => {
        const success = await blackleafService.sendCustomMessage(phone, message);
        return { success };
    }
};
