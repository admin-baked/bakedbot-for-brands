// src/app/page.tsx
import styles from './home.module.css';
import Link from 'next/link';
import { HeroInput } from '@/components/home/hero-input';

export default function HomePage() {
  return (
    <div className={styles.page}>
      <header className={styles.nav}>
        <div className={styles.navInner}>
          <div className={styles.navLeft}>
            <div className={styles.logoMark}>B</div>
            <div className={styles.logoText}>
              <div className={styles.logoTextMain}>BakedBot AI</div>
              <div className={styles.logoTextSub}>BrandOps OS for Cannabis</div>
            </div>
          </div>
          <nav className={styles.navLinks}>
            <a href="#how-it-works">How it works</a>
            <a href="#pricing">Pricing</a>
            <a href="#proof">Proof</a>
          </nav>
          <div className={styles.navCta}>
            <button className={styles.navGhost}>
              Built for <span>&nbsp;cannabis brands &amp; retailers</span>
            </button>
            <Link href="/dashboard/tasks">
              <button className={styles.navPrimary}>
                Try Dashboard
                <span className={styles.arrow}>↗</span>
              </button>
            </Link>
          </div>
        </div>
      </header>

      <main className={styles.container}>
        {/* HERO */}
        <section className={styles.hero}>
          <div className={styles.heroGrid}>
            <div>
              <div className={styles.eyebrow}>
                <span className={styles.eyebrowPill}>Autonomous Cannabis Commerce</span>
                Category-defining Brand &amp; Retail Ops
              </div>
              <h1 className={styles.heroTitle}>
                Launch a shoppable <span className={styles.gradient}>AI-powered brand store</span> in 60 seconds.
              </h1>
              <p className={styles.heroSubtitle}>
                BakedBot AI is the <strong>BrandOps OS for cannabis</strong> — headless menus, an AI Agent Budtender that lives on your site or ours, and natural-language automations that{" "}
                <strong>research competitors, pitch dispensaries, and grow sell-through</strong> while you sleep.
              </p>

              <HeroInput />

              <div className={styles.heroMetrics}>
                <span className={styles.badge}>
                  <strong>3×</strong> visibility on Google
                </span>
                <span className={styles.badge}>
                  <strong>50+</strong> orders in 90 days
                </span>
                <span className={styles.badge}>
                  <strong>85%</strong> automated workflows
                </span>
              </div>
              <div className={styles.heroCtas}>
                <Link href="/dashboard/tasks">
                  <button className={styles.btnSecondary}>
                    View Dashboard Demo
                  </button>
                </Link>
                <button className={styles.btnSecondary}>
                  <span className={styles.dot}></span>
                  Add Smokey to my site
                </button>
              </div>
              <p className={styles.heroFootnote}>
                Trusted by <span className={styles.brand}>Ultra Cannabis</span>, <span className={styles.brand}>Zaza Factory</span>, and <span className={styles.brand}>40 Tons</span> — system-impacted and equity operators included.
              </p>
            </div>

            <div className={styles.heroCard}>
              <div className={styles.heroCardHeader}>
                <div className={styles.heroCardTitle}>BrandOS cockpit</div>
                <div className={styles.heroCardPill}>Live automations</div>
              </div>
              <div className={styles.heroCardGrid}>
                <div className={styles.heroMiniCard}>
                  <div className={styles.heroMiniTitle}>Funnel snapshot</div>
                  <div className={styles.metricRow}>
                    <span className={styles.metricLabel}>Shopper sessions</span>
                    <span className={styles.metricValue}>12.4K</span>
                  </div>
                  <div className={styles.metricRow}>
                    <span className={styles.metricLabel}>AI-assisted orders</span>
                    <span className={`${styles.metricValue} ${styles.positive}`}>+38%</span>
                  </div>
                  <p className={styles.metricHint}>Smokey recommended products in 72% of carts this week.</p>
                  <hr style={{ border: "none", borderTop: "1px dashed rgba(148,163,184,0.9)", margin: "8px 0" }} />
                  <div className={styles.metricRow}>
                    <span className={styles.metricLabel}>Markets live</span>
                    <span className={styles.metricValue}>5</span>
                  </div>
                  <p className={styles.metricHint}>Menus synced across IL, MI, CA, NY &amp; OH — with or without our hosting.</p>
                </div>

                <div className={styles.heroMiniCard}>
                  <div className={styles.heroMiniTitle}>Smokey &amp; friends</div>
                  <div className={styles.heroChatBubble}>
                    <div className={styles.heroChatFrom}>
                      <span className={styles.dot}></span>
                      Smokey · AI Budtender
                    </div>
                    <div className={styles.heroChatText}>
                      “We’ve got 143 shoppers in <span className={styles.highlight}>Chicago</span> asking for sleep gummies, but 7 partner stores aren’t carrying your best-selling SKU. Want Craig to pitch them?”
                    </div>
                  </div>
                  <div className={styles.heroChatBubble}>
                    <div className={styles.heroChatFrom} style={{ color: "#111827" }}>
                      · Pops, Ezal &amp; Money Mike
                    </div>
                    <div className={styles.heroChatText}>
                      “Also — your competitor dropped price on live resin in Detroit. Money Mike suggests a weekend promo and Deebo already checked compliance.”
                    </div>
                  </div>
                  <div className={styles.heroAutomations}>
                    <span className={styles.automationPill}>
                      <span className={styles.bullet}></span>
                      Email 23 retailers not carrying new SKU
                    </span>
                    <span className={styles.automationPill}>
                      <span className={styles.bullet}></span>
                      Rebuild SEO content for IL sleep queries
                    </span>
                    <span className={styles.automationPill}>
                      <span className={styles.bullet}></span>
                      Generate Monday competitor report
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className={styles.section} id="how-it-works">
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>How BakedBot AI works</h2>
            <p className={styles.sectionKicker}>
              Whether you’re a brand or a dispensary, with or without a site, we plug in as your <strong>AI commerce engine</strong> — not another dashboard to babysit.
            </p>
          </div>

          <div className={styles.pillarsGrid}>
            <article className={styles.pillarCard}>
              <div className={styles.pillarTag}>Pillar one</div>
              <h3 className={styles.pillarTitle}>Headless menus &amp; instant brand sites</h3>
              <p className={styles.pillarBody}>
                Launch on <strong>bakedbot.ai/yourbrand</strong> or your own domain. We power shoppable menus, store locators, and SEO pages that rank — no dev team required.
              </p>
              <ul className={styles.pillarList}>
                <li>Brand page on bakedbot.ai in under 60 seconds</li>
                <li>Point your own domain via CNAME/A record</li>
                <li>Shop-by-brand, shop-by-retailer, or both</li>
                <li>SEO-optimized menus instead of iframes</li>
              </ul>
            </article>

            <article className={styles.pillarCard}>
              <div className={styles.pillarTag}>Pillar two</div>
              <h3 className={styles.pillarTitle}>Smokey – AI Agent Budtender anywhere</h3>
              <p className={styles.pillarBody}>
                Smokey learns your SKUs, terpenes, and effects, then guides shoppers on <strong>your site, your app, or your existing menu</strong> — while building a first-party data set.
              </p>
              <ul className={styles.pillarList}>
                <li>Drop-in widget for brand &amp; dispensary sites</li>
                <li>Embeds into existing menus &amp; POS-friendly flows</li>
                <li>23% average conversion lift, 18% bigger carts</li>
                <li>Deebo keeps every answer and campaign compliant</li>
              </ul>
            </article>

            <article className={styles.pillarCard}>
              <div className={styles.pillarTag}>Pillar three</div>
              <h3 className={styles.pillarTitle}>Natural-language automations &amp; agents</h3>
              <p className={styles.pillarBody}>
                Tell BakedBot what you want in plain language: <em>“Every Monday, check who’s not stocking my new pen and pitch them.”</em> Our agents handle the rest.
              </p>
              <ul className={styles.pillarList}>
                <li>Research competitors and menu gaps</li>
                <li>Pitch dispensaries that should be carrying you</li>
                <li>Trigger Craig campaigns when Smokey finds demand</li>
                <li>Get Pops, Ezal, Money Mike &amp; Deebo working together</li>
              </ul>
            </article>
          </div>
        </section>

        {/* PRICING */}
        <section className={styles.section} id="pricing">
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Plans for brands &amp; retailers at every stage</h2>
            <p className={styles.sectionKicker}>
              Start with Smokey, then grow into a fully autonomous BrandOps OS. Setup fees help serious teams move fast with <strong>white-glove rollout</strong>.
            </p>
          </div>

          <div className={styles.pricingGrid}>
            {/* Smokey Chat */}
            <article className={styles.planCard}>
              <div className={styles.planLabel}>Starter</div>
              <h3 className={styles.planName}>Smokey Chat</h3>
              <div className={styles.planPrice}>$25/mo</div>
              <div className={styles.planSetup}>No setup fee · launch yourself in minutes</div>
              <span className={styles.planPill}>Creators, micro-brands &amp; small shops</span>
              <p className={styles.planDesc}>
                Get Smokey on a hosted brand page on bakedbot.ai — a fast on-ramp to AI-powered commerce.
              </p>
              <ul className={styles.planFeatureList}>
                <li>Smokey Lite · 1,000 sessions/mo</li>
                <li>Hosted brand page on bakedbot.ai/yourbrand</li>
                <li>Basic headless menu &amp; store locator</li>
                <li>2 simple automations (reports, alerts)</li>
              </ul>
              <div className={styles.planCta}>
                Try Smokey
                <span className={styles.arrow}>↗</span>
              </div>
            </article>

            {/* Smokey Embedded */}
            <article className={styles.planCard}>
              <div className={styles.planLabel}>Embed</div>
              <h3 className={styles.planName}>Smokey for Existing Sites</h3>
              <div className={styles.planPrice}>$99/mo</div>
              <div className={styles.planSetup}>$500 optional setup for advanced integrations</div>
              <span className={styles.planPill}>Brands &amp; dispensaries with infra in place</span>
              <p className={styles.planDesc}>
                Keep your current stack. Drop Smokey into your website, menu, or app to turn confusion into conversions.
              </p>
              <ul className={styles.planFeatureList}>
                <li>Smokey Standard · 3,000 sessions</li>
                <li>Embeddable widget &amp; branding controls</li>
                <li>Works alongside existing menus &amp; POS</li>
                <li>Craig-ready for follow-up campaigns</li>
              </ul>
              <div className={styles.planCta}>
                Add Smokey to my stack
                <span className={styles.arrow}>↗</span>
              </div>
            </article>

            {/* Brand Growth */}
            <article className={styles.planCard}>
              <div className={styles.planLabel}>Scale</div>
              <h3 className={styles.planName}>Brand Growth</h3>
              <div className={styles.planPrice}>$399/mo</div>
              <div className={styles.planSetup}>$1,000 one-time setup for multi-market rollout</div>
              <span className={styles.planPill}>Growing, multi-market brands</span>
              <p className={styles.planDesc}>
                Multi-state menus, deeper automations, and agents that help you win and defend shelf space.
              </p>
              <ul className={styles.planFeatureList}>
                <li>Smokey Growth · 10,000 sessions</li>
                <li>Multi-market, multi-retailer routing</li>
                <li>Custom domain included for hosted sites</li>
                <li>20 automations · Craig Advanced · Ezal Pro</li>
              </ul>
              <div className={styles.planCta}>
                Talk to BrandOps
                <span className={styles.arrow}>↗</span>
              </div>
            </article>

            {/* Accelerator */}
            <article className={styles.planCard}>
              <div className={styles.planLabel}>Operate</div>
              <h3 className={styles.planName}>Brand Accelerator</h3>
              <div className={styles.planPrice}>$750/mo+</div>
              <div className={styles.planSetup}>$2,500+ setup · full BrandOS implementation</div>
              <span className={styles.planPill}>Serious teams, serious automation</span>
              <p className={styles.planDesc}>
                We roll out your BrandOS: hosted or embedded Smokey, agents, automations, and campaigns that run every month.
              </p>
              <ul className={styles.planFeatureList}>
                <li>Smokey Accelerator · 20,000+ sessions</li>
                <li>Managed campaigns with Craig</li>
                <li>50+ automations across agents</li>
                <li>Dedicated onboarding &amp; strategy</li>
              </ul>
              <div className={styles.planCta}>
                Book a working session
                <span className={styles.arrow}>↗</span>
              </div>
            </article>
          </div>
        </section>

        {/* PROOF */}
        <section className={styles.section} id="proof">
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Proven in the wild</h2>
            <p className={styles.sectionKicker}>
              African American-founded, equity-focused, and obsessed with data. In cannabis, results beat buzzwords every time.
            </p>
          </div>

          <div className={styles.proofGrid}>
            <article className={styles.proofCard}>
              <h3 className={styles.proofName}>Ultra Cannabis · Detroit</h3>
              <p className={styles.proofTagline}>Retailer velocity with AI menus</p>
              <p className={styles.proofMetrics}>
                <strong>3×</strong> visibility, <strong>50+</strong> new orders in 90 days, <strong>85%</strong> of routine workflows automated.
              </p>
              <p className={styles.proofNote}>
                Smokey powers education and the menu; Craig and Pops handle follow-ups and reporting so staff can focus on customers.
              </p>
            </article>

            <article className={styles.proofCard}>
              <h3 className={styles.proofName}>Zaza Factory</h3>
              <p className={styles.proofTagline}>Marketing that doesn’t burn licenses</p>
              <p className={styles.proofMetrics}>
                <strong>60%</strong> email open lift, <strong>30%</strong> repeat purchases, <strong>25%</strong> cost reduction.
              </p>
              <p className={styles.proofNote}>
                Deebo checks every send for compliance; Craig and Smokey work together to grow CLTV without risking the brand.
              </p>
            </article>

            <article className={styles.proofCard}>
              <h3 className={styles.proofName}>40 Tons Brand</h3>
              <p className={styles.proofTagline}>Equity-focused + data-driven</p>
              <p className={styles.proofMetrics}>
                Partner in building an equity-led AI stack across brands and retail partners.
              </p>
              <p className={styles.proofNote}>
                We turn AI into a competitive edge for system-impacted founders and social equity operators, not a barrier.
              </p>
            </article>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div>© 2025 BakedBot AI · Autonomous Cannabis Commerce</div>
          <div className={styles.footerLinks}>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Compliance</a>
            <a href="#">MCBA &amp; M4MM Partners</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
