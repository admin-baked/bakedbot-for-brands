/**
 * Welcome Email Automation Script
 *
 * Sends welcome emails to newly enrolled training cohort participants.
 * Uses Mailjet for email delivery.
 *
 * Usage:
 *   npx tsx dev/send-welcome-emails.ts --cohort cohort-pilot-2026-02
 *   npx tsx dev/send-welcome-emails.ts --cohort cohort-pilot-2026-02 --dry-run
 */

import { getAdminFirestore } from '../src/firebase/admin';
import { getAuth } from 'firebase-admin/auth';
import type { TrainingCohort } from '../src/types/training';
import Mailjet from 'node-mailjet';

interface EmailInput {
    cohortId: string;
    dryRun?: boolean;
}

interface ParticipantInfo {
    uid: string;
    email: string;
    displayName: string;
}

/**
 * Get participant information
 */
async function getParticipants(userIds: string[]): Promise<ParticipantInfo[]> {
    const auth = getAuth();
    const participants: ParticipantInfo[] = [];

    for (const uid of userIds) {
        try {
            const user = await auth.getUser(uid);
            participants.push({
                uid: user.uid,
                email: user.email || '',
                displayName: user.displayName || user.email?.split('@')[0] || 'Intern',
            });
        } catch (error) {
            console.error(`❌ Failed to get user ${uid}:`, error);
        }
    }

    return participants;
}

/**
 * Generate welcome email HTML
 */
function generateWelcomeEmail(participant: ParticipantInfo, cohort: TrainingCohort): string {
    const startDate = new Date(cohort.startDate._seconds * 1000).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 8px 8px 0 0;
            text-align: center;
        }
        .content {
            background: #fff;
            padding: 30px;
            border: 1px solid #e1e4e8;
            border-top: none;
            border-radius: 0 0 8px 8px;
        }
        .button {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
        }
        .info-box {
            background: #f6f8fa;
            border-left: 4px solid #667eea;
            padding: 15px;
            margin: 20px 0;
        }
        .checklist {
            background: #f0f4ff;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .checklist li {
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎉 Welcome to BakedBot Training!</h1>
    </div>

    <div class="content">
        <p>Hi ${participant.displayName},</p>

        <p>Congratulations! You've been enrolled in the <strong>${cohort.name}</strong>.</p>

        <div class="info-box">
            <strong>📅 Program Details:</strong><br>
            • Start Date: ${startDate}<br>
            • Duration: 8 weeks<br>
            • Format: Self-paced with weekly check-ins<br>
            • Certificate: Awarded upon completion
        </div>

        <h2>🚀 Getting Started</h2>

        <p>Follow these steps to begin your BakedBot journey:</p>

        <div class="checklist">
            <ol>
                <li><strong>Access Your Dashboard:</strong> Visit <a href="https://bakedbot.ai/dashboard/training">bakedbot.ai/dashboard/training</a></li>
                <li><strong>Review Week 1 Curriculum:</strong> Get familiar with the codebase and setup</li>
                <li><strong>Complete Your First Challenge:</strong> Submit "Hello BakedBot" for Linus review</li>
                <li><strong>Join Our Slack:</strong> Connect with fellow interns and instructors</li>
                <li><strong>Attend Kick-off Meeting:</strong> Friday 2pm PT on Google Meet (link in Slack)</li>
            </ol>
        </div>

        <center>
            <a href="https://bakedbot.ai/dashboard/training" class="button">
                Start Learning →
            </a>
        </center>

        <h2>📚 What to Expect</h2>

        <p><strong>Week 1:</strong> Foundations & Setup</p>
        <ul>
            <li>Navigate the BakedBot codebase</li>
            <li>Create your first Server Action</li>
            <li>Learn TypeScript best practices</li>
        </ul>

        <p><strong>Weeks 2-4:</strong> Core Skills</p>
        <ul>
            <li>Firestore database operations</li>
            <li>React components and UI</li>
            <li>API routes and integrations</li>
        </ul>

        <p><strong>Weeks 5-8:</strong> Advanced Topics</p>
        <ul>
            <li>Testing and quality assurance</li>
            <li>Agent architecture and memory</li>
            <li>Capstone project</li>
        </ul>

        <h2>🤖 Meet Linus</h2>

        <p>Linus is our AI CTO who will review all your code submissions. Expect:</p>
        <ul>
            <li>✅ Detailed feedback on TypeScript, patterns, and best practices</li>
            <li>✅ Constructive suggestions for improvement</li>
            <li>✅ Review turnaround in 30-60 seconds</li>
        </ul>

        <div class="info-box">
            <strong>💡 Pro Tip:</strong> Don't worry about making mistakes! Learning happens when you struggle a bit.
            Linus is here to guide you, not judge you. Submit your best attempt, learn from feedback, and iterate.
        </div>

        <h2>📞 Support</h2>

        <p>Need help? We're here for you:</p>
        <ul>
            <li><strong>Slack:</strong> #bakedbot-training (fastest response)</li>
            <li><strong>Office Hours:</strong> Fridays 2-3pm PT on Google Meet</li>
            <li><strong>Email:</strong> training@bakedbot.ai</li>
        </ul>

        <hr style="border: none; border-top: 1px solid #e1e4e8; margin: 30px 0;">

        <p style="color: #666; font-size: 14px;">
            This email was sent because you were enrolled in ${cohort.name}.
            Questions? Reply to this email or reach out on Slack.
        </p>

        <p style="color: #666; font-size: 14px;">
            <strong>BakedBot AI</strong> • Agentic Commerce OS for Cannabis
        </p>
    </div>
</body>
</html>
`;
}

/**
 * Send welcome emails via Mailjet
 */
async function sendWelcomeEmails(input: EmailInput): Promise<void> {
    console.log('📧 Welcome Email Automation\n');

    const db = getAdminFirestore();

    // Get cohort
    const cohortDoc = await db.collection('trainingCohorts').doc(input.cohortId).get();
    if (!cohortDoc.exists) {
        throw new Error(`Cohort not found: ${input.cohortId}`);
    }

    const cohort = cohortDoc.data() as TrainingCohort;
    console.log(`📋 Cohort: ${cohort.name}`);
    console.log(`   Participants: ${cohort.participantIds.length}\n`);

    if (cohort.participantIds.length === 0) {
        console.log('⚠️  No participants to email.');
        return;
    }

    // Get participant info
    console.log('👥 Fetching participant information...');
    const participants = await getParticipants(cohort.participantIds);
    console.log(`   Found ${participants.length} participants\n`);

    if (input.dryRun) {
        console.log('🔍 DRY RUN MODE - No emails will be sent\n');
        console.log('Preview:');
        console.log('='.repeat(60));

        for (const participant of participants.slice(0, 2)) {
            console.log(`\nTo: ${participant.email}`);
            console.log(`Subject: Welcome to ${cohort.name}!`);
            console.log(`Preview: Hi ${participant.displayName}, Congratulations!...`);
        }

        if (participants.length > 2) {
            console.log(`\n... and ${participants.length - 2} more\n`);
        }

        console.log('='.repeat(60));
        console.log('\n💡 Run without --dry-run to send emails');
        return;
    }

    // Initialize Mailjet
    const mailjet = new Mailjet({
        apiKey: process.env.MAILJET_API_KEY || '',
        apiSecret: process.env.MAILJET_SECRET_KEY || '',
    });

    if (!process.env.MAILJET_API_KEY || !process.env.MAILJET_SECRET_KEY) {
        throw new Error('Mailjet credentials not configured. Set MAILJET_API_KEY and MAILJET_SECRET_KEY');
    }

    console.log('📨 Sending emails...\n');

    let successCount = 0;
    let failCount = 0;

    for (const participant of participants) {
        try {
            const htmlContent = generateWelcomeEmail(participant, cohort);

            const request = mailjet.post('send', { version: 'v3.1' }).request({
                Messages: [
                    {
                        From: {
                            Email: 'training@bakedbot.ai',
                            Name: 'BakedBot Training',
                        },
                        To: [
                            {
                                Email: participant.email,
                                Name: participant.displayName,
                            },
                        ],
                        Subject: `Welcome to ${cohort.name}! 🎉`,
                        HTMLPart: htmlContent,
                    },
                ],
            });

            await request;
            console.log(`  ✅ Sent to ${participant.email}`);
            successCount++;

            // Rate limiting - wait 100ms between emails
            await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
            console.error(`  ❌ Failed to send to ${participant.email}:`, error);
            failCount++;
        }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Email Summary:');
    console.log(`   ✅ Sent: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   📈 Total: ${participants.length}`);
    console.log('='.repeat(60));
}

// CLI Argument Parsing
function parseArgs(): EmailInput {
    const args = process.argv.slice(2);
    const input: EmailInput = { cohortId: '', dryRun: false };

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--cohort' && args[i + 1]) {
            input.cohortId = args[i + 1];
            i++;
        } else if (args[i] === '--dry-run') {
            input.dryRun = true;
        }
    }

    if (!input.cohortId) {
        console.error('❌ Error: --cohort is required');
        console.log('\nUsage:');
        console.log('  npx tsx dev/send-welcome-emails.ts --cohort COHORT_ID');
        console.log('  npx tsx dev/send-welcome-emails.ts --cohort COHORT_ID --dry-run');
        process.exit(1);
    }

    return input;
}

// Run if called directly
if (require.main === module) {
    const input = parseArgs();

    sendWelcomeEmails(input)
        .then(() => {
            console.log('\n✅ Email automation complete!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Email automation failed:', error);
            process.exit(1);
        });
}

export { sendWelcomeEmails };
