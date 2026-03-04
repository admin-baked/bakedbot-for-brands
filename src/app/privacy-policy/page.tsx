import React from "react";
import Link from "next/link";
import Logo from "@/components/logo";

export const metadata = {
  title: "Privacy Policy | BakedBot AI",
  description: "How BakedBot AI LLC collects, uses, and protects your personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-50">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Logo height={32} />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Privacy Policy</h1>
        <p className="text-muted-foreground mb-12">Effective Date: March 3, 2026 &nbsp;|&nbsp; Last Updated: March 3, 2026</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-10">

          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-semibold mb-3">1. Introduction</h2>
            <p>
              BakedBot AI LLC (&quot;BakedBot,&quot; &quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) operates an agentic commerce platform for
              the cannabis industry, including the website <strong>bakedbot.ai</strong>, AI-powered business tools,
              and associated services (collectively, the &quot;Platform&quot;).
            </p>
            <p>
              This Privacy Policy explains how we collect, use, disclose, and protect personal information from:
            </p>
            <ul>
              <li><strong>Business customers</strong> — cannabis brands, dispensary operators, and their staff who use our Platform.</li>
              <li><strong>End customers</strong> — cannabis consumers who interact with brands and dispensaries powered by BakedBot.</li>
              <li><strong>Business contacts</strong> — prospective dispensary and brand partners we identify for outreach.</li>
              <li><strong>Visitors</strong> — anyone who accesses our public-facing website or marketing pages.</li>
            </ul>
            <p>
              By using the Platform, you agree to the practices described in this Policy. If you do not agree,
              please discontinue use.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <h2 className="text-2xl font-semibold mb-3">2. Information We Collect</h2>

            <h3 className="text-lg font-medium mt-4 mb-2">2.1 Business Customer Accounts</h3>
            <p>When a brand or dispensary registers for the Platform, we collect:</p>
            <ul>
              <li>Name, email address, and phone number of account holders and staff</li>
              <li>Business name, license number, and business address</li>
              <li>Role and permissions within the organization</li>
              <li>Billing information (credit card data is tokenized; we do not store raw card numbers)</li>
              <li>Google account tokens (Calendar, Drive) when you authorize those integrations — stored with AES-256 encryption</li>
              <li>Content you create, upload, or generate on the Platform (brand guides, campaigns, blog posts, playbooks)</li>
            </ul>

            <h3 className="text-lg font-medium mt-4 mb-2">2.2 End Customer Data (Cannabis Consumers)</h3>
            <p>When consumers interact with brands or dispensaries powered by BakedBot, we may process:</p>
            <ul>
              <li>Name, email address, and phone number</li>
              <li>Date of birth (required for age verification — cannabis law mandates 21+)</li>
              <li>Delivery address and location data</li>
              <li>Order history and transaction records</li>
              <li>Payment method (processed and tokenized by our payment partners; see Section 4)</li>
              <li>Loyalty program activity and reward balances</li>
              <li>SMS opt-in consent and communication preferences</li>
              <li>Product preferences and browsing behavior on brand-powered pages</li>
            </ul>

            <h3 className="text-lg font-medium mt-4 mb-2">2.3 Business Contacts (B2B Outreach)</h3>
            <p>
              As part of our sales and partnership outreach — primarily in New York — we collect business contact information
              from publicly available sources, including:
            </p>
            <ul>
              <li>Business name, website, and state license data (NY Office of Cannabis Management public records)</li>
              <li>Professional email addresses and phone numbers obtained via third-party data providers (Apollo.io)</li>
              <li>Publicly posted business social profiles</li>
            </ul>
            <p>
              This data is used solely to contact licensed cannabis operators about BakedBot services. We honor all
              opt-out requests immediately.
            </p>

            <h3 className="text-lg font-medium mt-4 mb-2">2.4 Automatically Collected Data</h3>
            <p>When you use the Platform, we automatically collect:</p>
            <ul>
              <li>IP address and approximate location (city/region)</li>
              <li>Browser type, operating system, and device identifiers</li>
              <li>Pages visited, features used, and time spent</li>
              <li>Session identifiers (stored in session cookies — see Section 8)</li>
              <li>Error logs and performance telemetry</li>
              <li>AI agent interaction logs (tool calls, response latency, estimated token usage)</li>
            </ul>
          </section>

          {/* How We Use Information */}
          <section>
            <h2 className="text-2xl font-semibold mb-3">3. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul>
              <li><strong>Provide the Platform</strong> — operate AI agents, process campaigns, sync POS data, generate content, and deliver analytics.</li>
              <li><strong>Process orders and payments</strong> — fulfill cannabis orders through licensed dispensary partners.</li>
              <li><strong>Verify age and comply with cannabis law</strong> — confirm that end customers are 21 or older before facilitating any transaction.</li>
              <li><strong>Send marketing communications</strong> — deliver SMS and email campaigns on behalf of brands and dispensaries, always with prior consent and in compliance with TCPA.</li>
              <li><strong>Improve AI agents and platform features</strong> — analyze usage patterns, run evaluations, and improve recommendation quality.</li>
              <li><strong>Operate loyalty programs</strong> — track points, tier advancement, and reward redemption.</li>
              <li><strong>Ensure compliance</strong> — review campaign content for regulatory compliance (state advertising restrictions, medical claim prohibitions, age-gating requirements).</li>
              <li><strong>Communicate with you</strong> — send account notifications, billing information, and support responses.</li>
              <li><strong>Detect fraud and maintain security</strong> — monitor for unauthorized access and protect platform integrity.</li>
              <li><strong>Meet legal obligations</strong> — respond to lawful requests from regulatory and law enforcement agencies.</li>
            </ul>
          </section>

          {/* Sharing */}
          <section>
            <h2 className="text-2xl font-semibold mb-3">4. How We Share Your Information</h2>
            <p>We do <strong>not sell</strong> your personal information. We share data only as described below:</p>

            <h3 className="text-lg font-medium mt-4 mb-2">Service Providers</h3>
            <ul>
              <li><strong>Payment processors</strong> — CannPay and Authorize.net process and tokenize payment card data. Raw card numbers never touch our servers.</li>
              <li><strong>SMS provider</strong> — Blackleaf delivers text messages on behalf of dispensary customers. Message logs are retained per TCPA requirements.</li>
              <li><strong>Email provider</strong> — Mailjet and SendGrid deliver email campaigns and transactional notifications.</li>
              <li><strong>AI providers</strong> — Google (Gemini models) and Anthropic (Claude models) process conversation and content generation requests. We transmit the minimum data needed; see each provider&apos;s data processing terms.</li>
              <li><strong>POS integration</strong> — Alleaves POS receives and sends order and inventory data for participating dispensaries.</li>
              <li><strong>Loyalty platform</strong> — Alpine IQ processes loyalty program data for participating dispensaries.</li>
              <li><strong>Analytics and error tracking</strong> — Firebase (Google) and Sentry receive usage telemetry and error logs.</li>
              <li><strong>B2B data enrichment</strong> — Apollo.io provides professional contact data for licensed cannabis business outreach.</li>
            </ul>

            <h3 className="text-lg font-medium mt-4 mb-2">Dispensary Partners</h3>
            <p>
              When an end customer places an order or interacts with a dispensary through BakedBot, the relevant
              customer data (name, contact info, order details) is shared with that licensed dispensary for order
              fulfillment and compliance recordkeeping.
            </p>

            <h3 className="text-lg font-medium mt-4 mb-2">Legal and Regulatory</h3>
            <p>
              We may disclose information to law enforcement, regulators (including state cannabis control agencies),
              or other third parties when required by law, court order, or to protect the safety of our users or the public.
            </p>

            <h3 className="text-lg font-medium mt-4 mb-2">Business Transfers</h3>
            <p>
              If BakedBot AI LLC is acquired, merges, or transfers assets, personal information may be transferred
              as part of that transaction. We will notify affected users before any such transfer takes effect.
            </p>
          </section>

          {/* SMS / TCPA */}
          <section>
            <h2 className="text-2xl font-semibold mb-3">5. SMS and Text Communications (TCPA)</h2>
            <p>
              BakedBot powers SMS marketing campaigns for licensed cannabis brands and dispensaries.
              By providing your phone number and opting in, you consent to receive text messages, which may include:
            </p>
            <ul>
              <li>Promotional offers and product announcements</li>
              <li>Order confirmations and delivery updates</li>
              <li>Loyalty program notifications</li>
              <li>Win-back and re-engagement messages</li>
            </ul>
            <p>
              <strong>Message frequency varies.</strong> Standard message and data rates may apply.
            </p>
            <p>
              <strong>To opt out:</strong> Reply <strong>STOP</strong> to any message at any time. You will receive
              one confirmation message and no further texts. To re-subscribe, reply <strong>START</strong>.
            </p>
            <p>
              <strong>For help:</strong> Reply <strong>HELP</strong> or contact us at{" "}
              <a href="mailto:privacy@bakedbot.ai">privacy@bakedbot.ai</a>.
            </p>
            <p>
              We maintain TCPA-compliant opt-in records and honor opt-outs within the timeframes required by law.
            </p>
          </section>

          {/* AI and Automated Processing */}
          <section>
            <h2 className="text-2xl font-semibold mb-3">6. AI Agents and Automated Processing</h2>
            <p>
              Our Platform uses AI agents (including Smokey, Craig, Deebo, Leo, Linus, and others) to assist
              business customers with tasks such as content creation, campaign review, compliance checking,
              and competitive intelligence. When you interact with these agents:
            </p>
            <ul>
              <li>Your conversation content and requests are processed by large language model providers (Google, Anthropic).</li>
              <li>Interaction logs are retained to improve agent quality and for troubleshooting.</li>
              <li>Compliance agents (Deebo) analyze campaign content against state regulations — this may involve reviewing business-created text and images.</li>
              <li>No automated agent decision carries irreversible consequences without human review. Agents surface recommendations; humans approve actions.</li>
            </ul>
            <p>
              We do not use AI agents to make automated decisions about creditworthiness, employment eligibility,
              or any other high-stakes personal determination.
            </p>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="text-2xl font-semibold mb-3">7. Cookies and Tracking Technologies</h2>
            <p>We use the following types of cookies and similar technologies:</p>
            <ul>
              <li><strong>Authentication cookies</strong> (<code>__session</code>) — Required to maintain your logged-in state. Session-scoped; deleted when you close your browser or sign out.</li>
              <li><strong>Age verification cookies</strong> — Record that a visitor has confirmed they are 21 or older on brand and dispensary menu pages.</li>
              <li><strong>Analytics</strong> — Firebase Analytics collects anonymized usage data to help us understand feature adoption and performance.</li>
              <li><strong>Error tracking</strong> — Sentry may set identifiers to correlate error reports with session context.</li>
            </ul>
            <p>
              You can disable cookies in your browser settings. Disabling authentication cookies will prevent you
              from signing in to the Platform.
            </p>
          </section>

          {/* California Rights */}
          <section>
            <h2 className="text-2xl font-semibold mb-3">8. California Residents — CCPA / CPRA Rights</h2>
            <p>
              If you are a California resident, the California Consumer Privacy Act (CCPA) and California Privacy
              Rights Act (CPRA) grant you the following rights:
            </p>
            <ul>
              <li><strong>Right to Know</strong> — Request disclosure of the categories and specific pieces of personal information we have collected about you, the sources, the business purposes, and the categories of third parties with whom we share it.</li>
              <li><strong>Right to Delete</strong> — Request deletion of personal information we hold about you, subject to legal exceptions (e.g., cannabis transaction records required by state law).</li>
              <li><strong>Right to Correct</strong> — Request correction of inaccurate personal information.</li>
              <li><strong>Right to Opt Out of Sale or Sharing</strong> — We do not sell or share personal information for cross-context behavioral advertising. This right is not currently applicable.</li>
              <li><strong>Right to Limit Use of Sensitive Personal Information</strong> — We only use sensitive personal information (date of birth, payment data) as necessary to provide services and comply with cannabis regulations.</li>
              <li><strong>Right to Non-Discrimination</strong> — Exercising your privacy rights will not result in denial of service, different prices, or degraded quality.</li>
            </ul>
            <p>
              <strong>To submit a request:</strong> Email <a href="mailto:privacy@bakedbot.ai">privacy@bakedbot.ai</a> with the subject
              &quot;California Privacy Request.&quot; We will respond within 45 days. We may ask you to verify your identity before fulfilling the request.
            </p>
            <p>
              Authorized agents may submit requests on your behalf with a signed written authorization or power of attorney.
            </p>
          </section>

          {/* New York */}
          <section>
            <h2 className="text-2xl font-semibold mb-3">9. New York Residents — SHIELD Act</h2>
            <p>
              New York&apos;s SHIELD Act requires businesses that handle private information of New York residents to
              implement reasonable data security safeguards and to notify affected residents of any breach of private information.
            </p>
            <p>Our safeguards include:</p>
            <ul>
              <li>AES-256 encryption for sensitive credentials and OAuth tokens</li>
              <li>Tokenized payment processing (raw payment data never stored)</li>
              <li>Role-based access controls — staff can only access data relevant to their role</li>
              <li>Firebase Security Rules enforcing organizational data isolation</li>
              <li>Continuous monitoring and automated alerting for security anomalies</li>
            </ul>
            <p>
              In the event of a data breach affecting New York residents, we will provide notification as required by
              the SHIELD Act, including to the New York Attorney General if 500 or more New York residents are affected.
            </p>
          </section>

          {/* Cannabis Compliance */}
          <section>
            <h2 className="text-2xl font-semibold mb-3">10. Cannabis Industry Compliance</h2>
            <p>
              Because our Platform operates in the regulated cannabis industry, additional data practices apply:
            </p>
            <ul>
              <li>
                <strong>Age verification (21+)</strong> — All consumer-facing brand and dispensary pages are age-gated.
                We collect date of birth to verify the 21+ requirement mandated by state cannabis law. Age verification
                records may be retained for compliance audit purposes.
              </li>
              <li>
                <strong>Transaction recordkeeping</strong> — Cannabis regulations in New York, California, and other states
                require that dispensaries maintain transaction records for a minimum of 7 years. We store and retain order
                data for participating dispensaries in accordance with these requirements.
              </li>
              <li>
                <strong>State regulatory access</strong> — Licensed dispensaries may be required to provide transaction
                data to the New York Office of Cannabis Management, the California Department of Cannabis Control,
                or equivalent state agencies. BakedBot facilitates compliance with such requirements.
              </li>
              <li>
                <strong>Minor protection</strong> — We do not knowingly collect personal information from anyone under
                21 years of age. If we discover that a minor has provided information, we will delete it promptly.
              </li>
            </ul>
          </section>

          {/* Data Security */}
          <section>
            <h2 className="text-2xl font-semibold mb-3">11. Data Security</h2>
            <p>
              We implement security measures appropriate to the sensitivity of the data we process, including:
            </p>
            <ul>
              <li>AES-256 encryption for stored OAuth tokens and sensitive credentials</li>
              <li>TLS encryption for all data in transit</li>
              <li>Tokenized payment processing — payment card data is processed by PCI-compliant third parties</li>
              <li>Firebase Authentication with secure session management</li>
              <li>Role-based access control — users only access data scoped to their organization and role</li>
              <li>Automated anomaly detection and alerting</li>
              <li>Regular security testing and access control reviews</li>
            </ul>
            <p>
              No method of transmission or storage is 100% secure. We cannot guarantee absolute security, but we
              continuously work to protect your information.
            </p>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="text-2xl font-semibold mb-3">12. Data Retention</h2>
            <ul>
              <li><strong>Cannabis transaction records</strong> — Retained for 7 years as required by state cannabis regulations.</li>
              <li><strong>Account and business data</strong> — Retained for the duration of your account plus 2 years after closure, unless a deletion request is submitted and no regulatory hold applies.</li>
              <li><strong>SMS opt-in records</strong> — Retained for 4 years per TCPA requirements.</li>
              <li><strong>AI agent interaction logs</strong> — Retained for 90 days for quality improvement, then anonymized or deleted.</li>
              <li><strong>Security and audit logs</strong> — Retained for 2 years.</li>
              <li><strong>B2B outreach contacts</strong> — Retained until an opt-out is received or outreach is concluded, whichever is sooner.</li>
            </ul>
          </section>

          {/* Third-Party Links */}
          <section>
            <h2 className="text-2xl font-semibold mb-3">13. Third-Party Links and Services</h2>
            <p>
              The Platform may contain links to third-party websites (e.g., dispensary websites, payment portals,
              public cannabis data sources). This Policy does not apply to those sites. We encourage you to review
              the privacy policies of any third-party service you use.
            </p>
          </section>

          {/* Changes */}
          <section>
            <h2 className="text-2xl font-semibold mb-3">14. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy periodically. If we make material changes, we will update the
              &quot;Last Updated&quot; date at the top of this page and, where appropriate, notify you by email or
              an in-platform notice. Continued use of the Platform after changes take effect constitutes your
              acceptance of the revised Policy.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-semibold mb-3">15. Contact Us</h2>
            <p>
              If you have questions, concerns, or requests regarding this Privacy Policy or your personal information:
            </p>
            <address className="not-italic">
              <strong>BakedBot AI LLC</strong><br />
              Privacy Team<br />
              <a href="mailto:privacy@bakedbot.ai">privacy@bakedbot.ai</a>
            </address>
            <p className="mt-4">
              For California privacy requests, please include &quot;California Privacy Request&quot; in the subject line.<br />
              For New York SHIELD Act inquiries, please include &quot;NY Privacy Request&quot; in the subject line.
            </p>
          </section>

        </div>
      </main>

      <footer className="border-t border-border mt-16 py-8 text-center text-sm text-muted-foreground">
        <p>
          &copy; {new Date().getFullYear()} BakedBot AI LLC. All rights reserved.{" "}
          <Link href="/privacy-policy" className="underline">Privacy Policy</Link>
        </p>
      </footer>
    </div>
  );
}
