/**
 * Set up Welcome Sequence Playbook for Ecstatic Edibles (INACTIVE/DRAFT)
 *
 * Creates a welcome email sequence for launch party customers.
 * Status is set to 'draft' so it won't auto-trigger.
 *
 * Run: node scripts/setup-welcome-sequence.js
 */

const admin = require('firebase-admin');
const path = require('path');

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    path.join(__dirname, '..', 'service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(require(serviceAccountPath)),
        projectId: 'studio-567050101-bc6e8'
    });
}

const db = admin.firestore();

async function setupWelcomeSequence() {
    const orgId = 'brand_ecstatic_edibles';
    const brandName = 'Ecstatic Edibles';

    console.log(`Setting up Welcome Sequence playbook for ${brandName}\n`);

    // Check if playbook already exists
    const existing = await db.collection('playbookDrafts')
        .where('orgId', '==', orgId)
        .where('name', '==', 'Launch Party Welcome Sequence')
        .limit(1)
        .get();

    if (!existing.empty) {
        console.log('Playbook already exists. Updating...');
        const docId = existing.docs[0].id;
        await db.collection('playbookDrafts').doc(docId).update({
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`Updated existing playbook: ${docId}`);
        return docId;
    }

    // Create the welcome sequence playbook
    const playbook = {
        name: 'Launch Party Welcome Sequence',
        description: 'Automated 7-day email sequence for launch party attendees who received free Snickerdoodle Bites and Berry Cheesecake Gummies.',
        orgId: orgId,
        brandName: brandName,
        agent: 'mrs_parker',
        category: 'customer_success',
        status: 'draft', // INACTIVE - won't auto-trigger
        requiresApproval: true,

        // Trigger configuration (inactive until status changed to 'active')
        triggers: [
            {
                type: 'manual',
                description: 'Manually trigger for launch_party tagged customers'
            },
            {
                type: 'event',
                eventName: 'customer.tagged',
                condition: 'tag === "launch_party"',
                enabled: false // Disabled for now
            }
        ],

        // Email sequence steps
        steps: [
            {
                id: 'step_1',
                name: 'Welcome Email',
                action: 'email',
                delay: null, // Send immediately
                params: {
                    emailType: 'welcome',
                    subject: 'Thanks for joining us at the Ecstatic Edibles launch! 🌿',
                    template: 'launch_party_welcome',
                    preheader: 'We hope you enjoyed your free samples!'
                },
                content: {
                    intro: "Hey {{firstName}}! It was great seeing you at our launch party.",
                    body: "We hope you enjoyed your complimentary Snickerdoodle Bites and Berry Cheesecake Gummies! We'd love to hear what you thought.\n\nAs a launch party guest, you're part of our founding family. Here's an exclusive code just for you:",
                    cta: {
                        text: 'Shop Now with 25% Off',
                        code: 'LAUNCH25',
                        url: 'https://ecstaticedibles.com/shop'
                    },
                    signature: 'The Ecstatic Edibles Team 🎉'
                }
            },
            {
                id: 'step_2',
                name: 'Day 3 - How did you like it?',
                action: 'email',
                delay: { value: 3, unit: 'days' },
                params: {
                    emailType: 'onboarding',
                    subject: 'How did you like your edibles? 🍪',
                    template: 'launch_party_followup'
                },
                content: {
                    intro: "Hi {{firstName}}, it's been a few days since the launch party!",
                    body: "We're curious - have you tried your Snickerdoodle Bites or Berry Cheesecake Gummies yet? We'd love to know which one was your favorite!\n\nClick below to let us know, and we'll send you personalized recommendations.",
                    cta: {
                        text: 'Share Your Favorite',
                        url: 'https://ecstaticedibles.com/feedback'
                    }
                }
            },
            {
                id: 'step_3',
                name: 'Day 7 - Last chance for discount',
                action: 'email',
                delay: { value: 7, unit: 'days' },
                params: {
                    emailType: 'promotion',
                    subject: 'Your LAUNCH25 code expires soon! ⏰',
                    template: 'launch_party_urgency'
                },
                content: {
                    intro: "{{firstName}}, your launch party discount is about to expire!",
                    body: "Your exclusive 25% off code LAUNCH25 expires in 48 hours. Don't miss out on stocking up on your favorite edibles.",
                    cta: {
                        text: 'Use Code Before It Expires',
                        code: 'LAUNCH25',
                        url: 'https://ecstaticedibles.com/shop'
                    },
                    urgency: 'Code expires in 48 hours'
                }
            }
        ],

        // Targeting
        targetSegment: 'new',
        targetTags: ['launch_party'],
        excludeTags: ['unsubscribed', 'opted_out'],

        // Stats (will be updated when playbook runs)
        runCount: 0,
        successCount: 0,
        failureCount: 0,
        lastRunAt: null,

        // Metadata
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: 'system'
    };

    const docRef = await db.collection('playbookDrafts').add(playbook);
    console.log(`Created playbook draft: ${docRef.id}`);

    return docRef.id;
}

setupWelcomeSequence()
    .then((playbookId) => {
        console.log(`\n=== Setup Complete ===`);
        console.log(`Playbook ID: ${playbookId}`);
        console.log(`Status: DRAFT (inactive)`);
        console.log(`\nTo activate:`);
        console.log(`1. Go to /dashboard/playbooks`);
        console.log(`2. Review and edit the playbook`);
        console.log(`3. Change status to 'active' when ready`);
        process.exit(0);
    })
    .catch(err => {
        console.error('Setup failed:', err);
        process.exit(1);
    });
