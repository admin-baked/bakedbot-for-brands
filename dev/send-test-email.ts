
import { sendGenericEmail } from '../src/lib/email/dispatcher';
import { emailService } from '../src/lib/notifications/email-service';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
    console.log('Sending test email...');
    
    const success = await sendGenericEmail({
        to: 'martez@bakedbot.ai',
        subject: 'BakedBot AI',
        htmlBody: `
            <div style="font-family: sans-serif; padding: 20px;">
                <h1 style="color: #2e7d32;">Hello from BakedBot AI</h1>
                <p>This is a test email sent via the Mailjet integration.</p>
                <p><strong>System Status:</strong> Operational 🟢</p>
                <p><strong>Agent Squad:</strong> Online 🤖</p>
                <hr />
                <p><em>"Stay Baked, Stay Automated."</em></p>
            </div>
        `
    });

    if (success.success) {
        console.log('Generic Email sent successfully!');
    } else {
        console.error('Failed to send generic email:', success.error);
    }

    console.log('Testing Invite Logic...');
    // We mock the dispatcher inside emailService in unit tests, but here we run real code.
    // However, emailService uses `import()` which works in Node.
    try {
        const inviteSuccess = await emailService.sendInvitationEmail(
            'martez@bakedbot.ai', 
            'https://bakedbot.ai/join/test-token', 
            'super_admin', 
            'Test Corp'
        );
        if (inviteSuccess) {
            console.log('Invite Email sent successfully!');
        } else {
             console.error('Failed to send invite email.');
        }
    } catch (e) {
        console.error('Invite test failed exception:', e);
    }
}

main().catch(console.error);
