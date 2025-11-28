import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Privacy Policy - BakedBot',
    description: 'Privacy Policy for BakedBot platform',
};

export default function PrivacyPage() {
    return (
        <div className="container mx-auto px-4 py-12 max-w-4xl">
            <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
            <div className="prose prose-gray max-w-none">
                <p className="text-sm text-muted-foreground mb-8">Last Updated: November 28, 2024</p>

                <h2>1. Information We Collect</h2>
                <ul>
                    <li><strong>Personal:</strong> Name, email, phone, date of birth</li>
                    <li><strong>Transaction:</strong> Order history, payment info (tokenized)</li>
                    <li><strong>Usage:</strong> IP address, browser type, pages visited</li>
                    <li><strong>Compliance:</strong> Age verification records</li>
                </ul>

                <h2>2. How We Use Information</h2>
                <ul>
                    <li>Process orders and payments</li>
                    <li>Verify age and compliance</li>
                    <li>Send order notifications</li>
                    <li>Improve our services</li>
                    <li>Comply with legal obligations</li>
                </ul>

                <h2>3. Information Sharing</h2>
                <p>We share data with:</p>
                <ul>
                    <li>Dispensaries (for order fulfillment)</li>
                    <li>Payment processors (Stripe, CannPay)</li>
                    <li>Law enforcement (when required)</li>
                </ul>
                <p>We do NOT sell your personal information.</p>

                <h2>4. Data Security</h2>
                <p>We use industry-standard encryption and security measures. However, no method is 100% secure.</p>

                <h2>5. Your Rights</h2>
                <ul>
                    <li>Access your data</li>
                    <li>Request corrections</li>
                    <li>Delete your account</li>
                    <li>Opt-out of marketing</li>
                </ul>

                <h2>6. Cookies</h2>
                <p>We use cookies for age verification, authentication, and analytics. You can disable cookies in your browser.</p>

                <h2>7. Data Retention</h2>
                <p>We retain data for 7 years for compliance purposes, or as required by law.</p>

                <h2>8. Children's Privacy</h2>
                <p>Our service is not for anyone under 18. We do not knowingly collect data from minors.</p>

                <h2>9. Changes to Policy</h2>
                <p>We may update this policy. Check this page periodically for changes.</p>

                <h2>10. Contact</h2>
                <p>Privacy questions: privacy@bakedbot.ai</p>
            </div>
        </div>
    );
}
