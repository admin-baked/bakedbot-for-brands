
import { sendGenericEmail } from 'src/lib/email/mailjet';
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

    if (success) {
        console.log('Email sent successfully!');
    } else {
        console.error('Failed to send email.');
        process.exit(1);
    }
}

main().catch(console.error);
