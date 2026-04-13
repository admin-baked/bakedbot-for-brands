import { getAdminFirestore } from '@/firebase/admin';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import { Member, Membership, Pass, Reward, ClubEvent } from '@/types/club';
import { logger } from '@/lib/logger';
import { processClubEvent } from './event-processor';

export class MembershipService {
    /**
     * Join/Enroll a new member.
     * Validates if the phone is already in use.
     * Creates Member, Membership, Pass, and Welcome Reward.
     */
    static async enroll(params: {
        organizationId: string;
        storeId?: string;
        firstName: string;
        lastName?: string;
        phone: string;
        email?: string;
        dateOfBirth?: string;
        smsConsent: boolean;
        emailConsent: boolean;
        source: "tablet" | "customer_app";
        existingCustomerId?: string;
    }) {
        const phone = params.phone.replace(/\D/g, '');
        if (phone.length < 10) throw new Error("Invalid phone number");

        const db = getAdminFirestore();
        const now = new Date().toISOString();

        // 1. Resolve Member (Customer)
        let memberId = params.existingCustomerId;
        let existingMember: Member | null = null;

        if (memberId) {
            const doc = await db.collection('members').doc(memberId).get();
            if (doc.exists) {
                existingMember = doc.data() as Member;
            }
        } else {
            // Deterministic lookup based on Org + Phone context
            const phoneHash = createHash('sha256').update(`${params.organizationId}:${phone}`).digest('hex').slice(0, 16);
            memberId = `member_${phoneHash}`;
            
            const doc = await db.collection('members').doc(memberId).get();
            if (doc.exists) {
                existingMember = doc.data() as Member;
            } else {
                // Secondary check for legacy docs (optional but safe)
                const phoneMatches = await db.collection('members')
                    .where('organizationId', '==', params.organizationId)
                    .where('phone', '==', phone)
                    .limit(1)
                    .get();
                
                if (!phoneMatches.empty) {
                    existingMember = phoneMatches.docs[0].data() as Member;
                    memberId = existingMember.id;
                }
            }
        }

        // 2. Check for existing Membership
        let mship: Membership | null = null;
        if (memberId) {
            const mshipMatches = await db.collection('memberships')
                .where('organizationId', '==', params.organizationId)
                .where('memberId', '==', memberId)
                .limit(1)
                .get();
            
            if (!mshipMatches.empty) {
                mship = mshipMatches.docs[0].data() as Membership;
            }
        }

        if (mship) {
            // Already enrolled in loyalty — return existing state
            if (!existingMember) {
                const memberDoc = await db.collection('members').doc(mship.memberId).get();
                existingMember = memberDoc.data() as Member;
            }

            const passMatches = await db.collection('passes')
                .where('membershipId', '==', mship.id)
                .limit(1)
                .get();
            
            logger.info(`[MembershipService] Member already enrolled: ${mship.memberId} (Org: ${params.organizationId})`);
            
            return { 
                member: existingMember!, 
                membership: mship, 
                pass: passMatches.empty ? null : passMatches.docs[0].data() as Pass,
                welcomeReward: null,
                isAlreadyEnrolled: true 
            };
        }

        // 3. Create everything new if needed
        if (!memberId) {
            memberId = `member_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
        }
        
        const membershipId = `mship_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
        const passId = `pass_${uuidv4().replace(/-/g, '').slice(0, 16)}`;

        const member: Member = existingMember || {
            id: memberId,
            organizationId: params.organizationId,
            defaultStoreId: params.storeId,
            firstName: params.firstName,
            lastName: params.lastName || '',
            fullName: `${params.firstName}${params.lastName ? ` ${params.lastName}` : ''}`.trim(),
            phone: phone,
            email: params.email,
            dateOfBirth: params.dateOfBirth,
            status: "active",
            verificationStatus: "unverified",
            communicationConsent: {
                sms: params.smsConsent,
                email: params.emailConsent,
                push: false,
                updatedAt: now
            },
            createdAt: now,
            updatedAt: now
        };

        const membership: Membership = {
            id: membershipId,
            memberId: memberId,
            organizationId: params.organizationId,
            storeId: params.storeId,
            status: "active",
            joinedAt: now,
            stats: {
                lifetimePointsEarned: 0,
                lifetimePointsRedeemed: 0,
                visitCount: 0,
                transactionCount: 0,
                lifetimeSpendCents: 0
            },
            createdAt: now,
            updatedAt: now
        };

        const memberCode = `B${phone.slice(-4)}${uuidv4().replace(/\D/g, '').slice(0, 6)}`;
        const pass: Pass = {
            id: passId,
            memberId: memberId,
            membershipId: membershipId,
            organizationId: params.organizationId,
            storeId: params.storeId,
            displayName: member.fullName,
            memberCode: memberCode,
            qrValue: `club:${params.organizationId}:${memberCode}`,
            barcodeValue: phone,
            barcodeType: "code128",
            status: "active",
            walletEligible: true,
            issuedAt: now,
            createdAt: now,
            updatedAt: now
        };

        const rewardId = `reward_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
        const welcomeReward: Reward = {
            id: rewardId,
            organizationId: params.organizationId,
            storeId: params.storeId,
            memberId: memberId,
            membershipId: membershipId,
            rewardType: "welcome_reward",
            title: "Join Bonus: 10% Off",
            description: "Thanks for joining our Rewards program!",
            status: "available",
            value: { percentOff: 10 },
            issuedAt: now,
            createdAt: now,
            updatedAt: now
        };

        const event: ClubEvent = {
            id: `evt_${uuidv4().replace(/-/g, '')}`,
            type: "member_enrollment_completed",
            occurredAt: now,
            organizationId: params.organizationId,
            storeId: params.storeId,
            actor: { type: "member", id: memberId },
            subject: { type: "member", id: memberId },
            source: { surface: params.source },
            payload: { phone, hasWelcomeReward: true }
        };

        // 7. Write to Firestore
        const batch = db.batch();
        if (!existingMember) {
            batch.set(db.collection('members').doc(memberId), member);
        }
        batch.set(db.collection('memberships').doc(membershipId), membership);
        batch.set(db.collection('passes').doc(passId), pass);
        batch.set(db.collection('rewards').doc(rewardId), welcomeReward);
        batch.set(db.collection('club_events').doc(event.id), event);

        await batch.commit();

        logger.info(`[MembershipService] New member enrolled: ${memberId} (Membership: ${membershipId}, Org: ${params.organizationId})`);

        // Process event through trigger registry (non-blocking)
        processClubEvent(event).catch(err => {
            logger.warn('[MembershipService] Event processing failed (non-fatal)', {
                eventId: event.id,
                error: err instanceof Error ? err.message : String(err),
            });
        });

        return { member, membership, pass, welcomeReward, isAlreadyEnrolled: false };
    }
}
