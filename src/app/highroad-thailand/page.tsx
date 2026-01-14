'use client';

import { useState } from 'react';
import Image from 'next/image';
import styles from './page.module.css';

const PARTNERS = [
    {
        name: 'Psychedelic State(s) of America',
        logo: '/images/highroad-thailand/psychedelic-states.png',
    },
    {
        name: 'Beard Bros Media',
        logo: '/images/highroad-thailand/beard-bros-media.png',
    },
    {
        name: 'Cash Color Cannabis',
        logo: '/images/highroad-thailand/cash-color-cannabis.png',
    },
    {
        name: 'Grow Magazine',
        logo: '/images/highroad-thailand/grow-magazine.png',
    },
    {
        name: 'Marijuana Venture',
        logo: '/images/highroad-thailand/marijuana-venture.png',
    },
    {
        name: 'BakedBot AI',
        logo: '/images/highroad-thailand/bakedbot-ai.png',
    },
    {
        name: 'Exhale Pro Stories',
        logo: '/images/highroad-thailand/exhale-pro.png',
    },
];

const BENEFITS = [
    'Brand placement across media coverage and event materials',
    'Contact list and direct introductions to tour partners and sponsors',
    'Special feature in Cannabis Legacy Chronicles book series',
    'VIP Invitations for Awards Gala and Afterparty',
];

export default function HighRoadThailandPage() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        company: '',
        phone: '',
        interest: '',
        message: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        // TODO: Integrate with your form submission endpoint
        await new Promise((resolve) => setTimeout(resolve, 1000));

        setSubmitted(true);
        setIsSubmitting(false);
    };

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
                ? 'auto'
                : 'smooth',
        });
    };

    return (
        <div className={styles.hrPage}>
            {/* Header */}
            <header className={styles.pageHeader} role="banner" aria-label="Site header">
                <div className={styles.headerInner}>
                    <strong className={styles.logo}>THE HIGH ROAD – THAILAND</strong>

                    <nav aria-label="Primary">
                        <ul className={styles.navList}>
                            <li>
                                <a href="#overview" className={styles.navLink}>
                                    Overview
                                </a>
                            </li>
                            <li>
                                <a href="#partners" className={styles.navLink}>
                                    Partners
                                </a>
                            </li>
                            <li>
                                <a href="#sponsorship" className={styles.navLink}>
                                    Sponsorship
                                </a>
                            </li>
                            <li>
                                <a href="#apply" className={styles.navLink}>
                                    Apply
                                </a>
                            </li>
                            <li>
                                <a href="#contact" className={styles.navLink}>
                                    Contact
                                </a>
                            </li>
                        </ul>
                    </nav>

                    <div className={styles.ctaWrap}>
                        <button
                            className={`${styles.btn} ${styles.btnLink}`}
                            onClick={scrollToTop}
                        >
                            Top
                        </button>
                        <button
                            className={`${styles.btn} ${styles.btnPrimary}`}
                            onClick={() => window.print()}
                            aria-label="Download as PDF"
                        >
                            Download
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className={styles.page} id="top">
                {/* Hero Section */}
                <section className={`${styles.section} ${styles.hero}`} id="overview" aria-label="Overview">
                    <h1 className={styles.heroTitle}>THE HIGH ROAD: BEYOND BORDERS – THAILAND</h1>
                    <p className={styles.meta}>
                        <strong>Tour Leaders:</strong> Vee, The Traveling Cannabis Writer • Monica, Cloud Eleven
                    </p>
                    <h2 className={styles.heroSubtitle}>Media & Market Tour • January 2026</h2>
                    <p className={styles.paragraph}>
                        The High Road: Beyond Borders – Thailand is a first-of-its-kind media and market tour
                        designed to build real connections between Thai cannabis operators and U.S. ancillary
                        companies. Taking place <strong>January 2026</strong>, the tour spotlights Thailand&apos;s
                        evolving medical cannabis landscape through storytelling, site visits, and direct
                        introductions—setting the stage for international expansion and long-term partnerships.
                    </p>
                    <p className={styles.paragraph}>
                        <strong>About the leaders:</strong> Vee is The Traveling Cannabis Writer, a global
                        storyteller and industry connector. Monica is a 30+-year cannabis veteran and
                        Thailand-based entrepreneur with deep market relationships.
                    </p>
                </section>

                {/* Partners Section */}
                <section className={styles.section} id="partners" aria-label="Media and Tech Partners">
                    <h3 className={styles.sectionTitle}>Media & Tech Partners</h3>
                    <div className={styles.logos} role="list" aria-label="Partner logos">
                        {PARTNERS.map((partner) => (
                            <div key={partner.name} className={styles.logoCard} role="listitem">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    loading="lazy"
                                    width={200}
                                    height={60}
                                    src={partner.logo}
                                    alt={`${partner.name} logo`}
                                    style={{ maxWidth: '100%', height: 'auto' }}
                                />
                            </div>
                        ))}
                    </div>
                    <div className={styles.pillList} aria-label="Partner list">
                        {PARTNERS.map((partner) => (
                            <span key={partner.name} className={styles.pill}>
                                {partner.name}
                            </span>
                        ))}
                    </div>
                </section>

                {/* Sponsorship Section */}
                <section className={styles.section} id="sponsorship" aria-label="Sponsorship Opportunities">
                    <h3 className={styles.sectionTitle}>Sponsorship Opportunities</h3>
                    <p className={styles.paragraph}>
                        Partner with us to connect cultures and elevate the global cannabis conversation.
                        Sponsorship packages start at <strong>$500</strong> and include on-the-ground visibility,
                        media coverage, and direct access to international industry leaders.
                    </p>
                    <p className={styles.paragraph}>
                        <strong>Benefits include:</strong>
                    </p>
                    <ul className={styles.benefits}>
                        {BENEFITS.map((benefit, index) => (
                            <li key={index} className={styles.benefitItem}>
                                {benefit}
                            </li>
                        ))}
                    </ul>
                </section>

                {/* Apply Section */}
                <section className={styles.section} id="apply" aria-label="Apply or Register Interest">
                    <h3 className={styles.sectionTitle}>Register Your Interest</h3>
                    <p className={styles.paragraph}>
                        Leave your details and we&apos;ll follow up with sponsorship options and next steps.
                    </p>

                    <div className={styles.formWrap}>
                        {submitted ? (
                            <div
                                style={{
                                    background: '#d4edda',
                                    border: '1px solid #c3e6cb',
                                    borderRadius: '12px',
                                    padding: '20px',
                                    textAlign: 'center',
                                    color: '#155724',
                                }}
                            >
                                <strong>Thank you for your interest!</strong>
                                <p>We&apos;ll be in touch soon with sponsorship options and next steps.</p>
                            </div>
                        ) : (
                            <form className={styles.form} onSubmit={handleSubmit}>
                                <p className={styles.formField}>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        placeholder="Your Name *"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </p>
                                <p className={styles.formField}>
                                    <input
                                        type="email"
                                        className={styles.input}
                                        placeholder="Email Address *"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </p>
                                <p className={styles.formField}>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        placeholder="Company Name"
                                        value={formData.company}
                                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                    />
                                </p>
                                <p className={styles.formField}>
                                    <input
                                        type="tel"
                                        className={styles.input}
                                        placeholder="Phone Number"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </p>
                                <p className={`${styles.formField} ${styles.formFieldFull}`}>
                                    <select
                                        className={styles.select}
                                        value={formData.interest}
                                        onChange={(e) => setFormData({ ...formData, interest: e.target.value })}
                                    >
                                        <option value="">Select your interest...</option>
                                        <option value="sponsor">Become a Sponsor</option>
                                        <option value="media">Media Partnership</option>
                                        <option value="attend">Attend the Tour</option>
                                        <option value="other">Other</option>
                                    </select>
                                </p>
                                <p className={`${styles.formField} ${styles.formFieldFull}`}>
                                    <textarea
                                        className={styles.textarea}
                                        placeholder="Tell us more about your interest..."
                                        value={formData.message}
                                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                    />
                                </p>
                                <p className={`${styles.formField} ${styles.formFieldFull}`}>
                                    <button
                                        type="submit"
                                        className={styles.submitBtn}
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? 'Submitting...' : 'Submit'}
                                    </button>
                                </p>
                            </form>
                        )}
                    </div>
                </section>

                {/* Contact Section */}
                <section className={styles.section} id="contact" aria-label="Contact">
                    <h3 className={styles.sectionTitle}>Contact</h3>
                    <p className={styles.paragraph}>
                        For sponsorships and media inquiries, email{' '}
                        <a href="mailto:castilloveronica01@outlook.com" className={styles.contactLink}>
                            castilloveronica01@outlook.com
                        </a>
                        .
                    </p>
                </section>

                {/* Footer */}
                <footer className={styles.siteFooter} role="contentinfo">
                    © {new Date().getFullYear()} The High Road: Beyond Borders – Thailand •{' '}
                    <a href="mailto:castilloveronica01@outlook.com">castilloveronica01@outlook.com</a>
                </footer>
            </main>
        </div>
    );
}
