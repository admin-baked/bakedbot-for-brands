import Image from 'next/image';
import Link from 'next/link';
import { headers } from 'next/headers';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowUpRight,
  Bath,
  BedDouble,
  Building2,
  CarFront,
  ChevronRight,
  Dumbbell,
  Facebook,
  Handshake,
  Instagram,
  KeyRound,
  Landmark,
  Mail,
  MapPin,
  Menu,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  Square,
  Star,
  Trees,
  Users,
  Waves,
} from 'lucide-react';

import { BakedBotHome } from '@/components/landing/bakedbot-home';

import styles from './inclub-home.module.css';

type IconCard = {
  icon: LucideIcon;
  title: string;
  text: string;
};

type ResidenceCard = {
  name: string;
  details: string;
  image: string;
  tag: string;
};

type TeamMember = {
  name: string;
  role: string;
  image: string;
};

type StoryCard = {
  title: string;
  description: string;
  image: string;
  meta: string;
};

const navItems = [
  { label: 'Overview', href: '#overview' },
  { label: 'Homes', href: '#residences' },
  { label: 'Features', href: '#amenities' },
  { label: 'Team', href: '#team' },
  { label: 'Contact', href: '#contact' },
];

const heroPoster =
  'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1800&q=80';
const heroVideo = 'https://demo.awaikenthemes.com/assets/videos/inclub-video.mp4';

const residenceCards: ResidenceCard[] = [
  {
    name: 'Design One',
    details: '3 Bed | 2 Bath | 1,588 sq. ft.',
    image:
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80',
    tag: 'Open-concept ranch plan',
  },
  {
    name: 'Design Two',
    details: '3 Bed | 2 Bath | 1,588 sq. ft.',
    image:
      'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1200&q=80',
    tag: 'Built for everyday living',
  },
  {
    name: 'Design Three',
    details: '3 Bed | 2 Bath | 1,588 sq. ft.',
    image:
      'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1200&q=80',
    tag: 'Flexible family-ready layout',
  },
];

const amenityCards: IconCard[] = [
  {
    icon: Sparkles,
    title: 'Enhanced indoor air quality',
    text: 'Advanced air filtration reduces pollutants and allergens for healthier day-to-day living.',
  },
  {
    icon: Waves,
    title: 'Optimized ventilation and airflow',
    text: 'Balanced circulation keeps each home feeling fresher, calmer, and more comfortable year-round.',
  },
  {
    icon: Dumbbell,
    title: 'Energy-efficient climate control',
    text: 'High-efficiency heating and cooling support comfort while helping reduce long-term utility costs.',
  },
  {
    icon: Landmark,
    title: 'Smart water conservation',
    text: 'Sustainable water systems minimize waste without sacrificing reliability for everyday use.',
  },
  {
    icon: KeyRound,
    title: 'Advanced water filtration',
    text: 'State-of-the-art filtration improves drinking water quality and supports peace of mind at home.',
  },
  {
    icon: ShieldCheck,
    title: 'Built-in security and smart safety',
    text: 'Reinforced construction and modern safety features help households feel protected from day one.',
  },
];

const comfortSteps: IconCard[] = [
  {
    icon: Building2,
    title: 'New homes for sale',
    text: 'Own a thoughtfully designed single-family home in Robbins, IL at an accessible price point.',
  },
  {
    icon: Handshake,
    title: 'Smart community planning',
    text: 'Homes are positioned for access to schools, parks, shopping, and major highways.',
  },
  {
    icon: Square,
    title: 'Built-in smart storage',
    text: 'Thoughtful storage keeps interiors organized, functional, and easy to live with.',
  },
  {
    icon: Users,
    title: 'Safe, family-friendly neighborhoods',
    text: 'Walkable surroundings and room for children and families to thrive support long-term ownership.',
  },
  {
    icon: Trees,
    title: 'Modern architecture and design',
    text: 'Open layouts and durable finishes balance style, function, and straightforward livability.',
  },
  {
    icon: Star,
    title: 'Quality and long-term value',
    text: 'Energy-efficient systems and durable construction make every home a stronger long-term investment.',
  },
];

const team: TeamMember[] = [
  {
    name: 'Marcus Andrews',
    role: 'Founder & CEO',
    image:
      'https://bakedbot.ai/wordpress/andrews/marcus-andrews.jpg',
  },
  {
    name: 'Kiki Andrews',
    role: 'Operations & Community',
    image:
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=900&q=80',
  },
  {
    name: 'Dennis Coleman',
    role: 'Legal & Development',
    image:
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f3d?auto=format&fit=crop&w=900&q=80',
  },
  {
    name: 'Tayser Muhammad',
    role: 'Real Estate Advisor',
    image:
      'https://bakedbot.ai/wordpress/andrews/tayser-muhammad.jpg',
  },
];

const stories: StoryCard[] = [
  {
    title: 'How the Robbins buildout creates neighborhood momentum',
    description: 'Andrews Developments is focused on long-term neighborhood value, not just isolated housing inventory.',
    image:
      'https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1200&q=80',
    meta: 'Community vision',
  },
  {
    title: 'Financing support for first-step ownership',
    description: 'Eligible buyers can access financing help, including up to $7.5K in down payment assistance.',
    image:
      'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1200&q=80',
    meta: 'Buyer support',
  },
  {
    title: 'From walkthrough to customization decisions',
    description: 'The team helps buyers move from tour scheduling to finishes and layout decisions without friction.',
    image:
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
    meta: 'Ownership path',
  },
];

const faqItems = [
  {
    title: 'How can I contact your team?',
    body: 'Email info@andrewsdevelopments.com or call 708-529-5173 and the team will walk you through availability and next steps.',
  },
  {
    title: 'Can I book a viewing?',
    body: 'Yes. Contact the team directly by phone or email and they will coordinate the next available tour window.',
  },
  {
    title: 'Is financing support available?',
    body: 'Yes. Financing support includes up to $7.5K in down payment assistance for eligible buyers. Details apply.',
  },
  {
    title: 'Can I customize my home?',
    body: 'Yes. Andrews Developments offers customization options to match your style and needs, from layout decisions to finish selections.',
  },
];

function SectionLead({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: React.ReactNode;
  description?: string;
}) {
  return (
    <div className={styles.sectionLead}>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {description ? <p className={styles.sectionText}>{description}</p> : null}
    </div>
  );
}

export default async function HomePage() {
  const headersList = await headers();
  const hostname =
    (headersList.get('x-forwarded-host') || headersList.get('host') || '').replace(/:\d+$/, '').toLowerCase();

  if (hostname !== 'andrewsdevelopments.bakedbot.ai') {
    return <BakedBotHome />;
  }

  const year = new Date().getFullYear();

  return (
    <div className={styles.page}>
      <section id="home" className={styles.hero}>
        <div className={styles.heroMedia}>
          <Image
            src={heroPoster}
            alt="Andrews Developments hero poster"
            fill
            priority
            sizes="100vw"
            className={styles.heroPoster}
          />
          <video
            className={styles.heroVideo}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster={heroPoster}
            aria-hidden="true"
          >
            <source src={heroVideo} type="video/mp4" />
          </video>
        </div>
        <div className={styles.heroOverlay} />

        <header className={styles.siteHeader}>
          <div className={styles.container}>
            <div className={styles.navBar}>
              <Link href="/" className={styles.brand}>
                <span className={styles.brandMark}>
                  <Building2 size={18} strokeWidth={2.3} />
                </span>
                <span className={styles.brandText}>ANDREWS</span>
              </Link>

              <nav className={styles.navLinks} aria-label="Primary">
                {navItems.map((item) => (
                  <a key={item.href} href={item.href}>
                    {item.label}
                  </a>
                ))}
              </nav>

              <div className={styles.headerActions}>
                <a href="#contact" className={styles.headerButton}>
                  Book a viewing
                </a>
                <button type="button" className={styles.menuButton} aria-label="Open navigation">
                  <Menu size={20} />
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className={`${styles.container} ${styles.heroInner}`}>
          <div className={styles.heroCopy}>
            <p className={styles.heroKicker}>Andrews Developments</p>
            <h1 className={styles.heroTitle}>
              Step into a new
              <br />
              era of <span className={styles.highlight}>Robbins, IL</span>
            </h1>
            <p className={styles.heroText}>
              Modern homes. Strong community. A brighter future. Andrews Developments is building 26 beautifully
              designed single-family homes with quality craftsmanship, energy efficiency, and affordability at the
              core.
            </p>

            <div className={styles.heroActionsRow}>
              <a href="#residences" className={styles.primaryButton}>
                Explore homes
                <ArrowUpRight size={16} />
              </a>
              <a href="#contact" className={styles.secondaryButton}>
                Talk with the team
              </a>
            </div>
          </div>

          <aside className={styles.heroPanel}>
            <div className={styles.heroPanelBlock}>
              <p className={styles.panelLabel}>Project snapshot</p>
              <div className={styles.panelMetricRow}>
                <span className={styles.panelMetric}>26</span>
                <span className={styles.panelHint}>Single-family homes planned</span>
              </div>
            </div>

            <div className={styles.heroPanelGrid}>
              <div className={styles.panelCard}>
                <span className={styles.panelCardLabel}>Home layout</span>
                <strong>3 Bed / 2 Bath</strong>
              </div>
              <div className={styles.panelCard}>
                <span className={styles.panelCardLabel}>Interior area</span>
                <strong>1,588 sq. ft.</strong>
              </div>
              <div className={styles.panelCard}>
                <span className={styles.panelCardLabel}>Buyer support</span>
                <strong>Up to $7.5K</strong>
              </div>
              <div className={styles.panelCard}>
                <span className={styles.panelCardLabel}>Community focus</span>
                <strong>Robbins, IL</strong>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <main>
        <section id="overview" className={`${styles.section} ${styles.paperSection}`}>
          <div className={`${styles.container} ${styles.introGrid}`}>
            <div className={styles.collage}>
              <div className={`${styles.collageCard} ${styles.collageTall}`}>
                <Image
                  src="https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=1200&q=80"
                  alt="Residential building exterior"
                  fill
                  sizes="(max-width: 900px) 100vw, 34vw"
                  className={styles.coverImage}
                />
              </div>
              <div className={`${styles.collageCard} ${styles.collageTop}`}>
                <Image
                  src="https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1200&q=80"
                  alt="Modern tower architecture"
                  fill
                  sizes="(max-width: 900px) 100vw, 24vw"
                  className={styles.coverImage}
                />
              </div>
              <div className={`${styles.collageCard} ${styles.collageBottomLeft}`}>
                <Image
                  src="https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80"
                  alt="Bedroom interior"
                  fill
                  sizes="(max-width: 900px) 50vw, 12vw"
                  className={styles.coverImage}
                />
              </div>
              <div className={`${styles.collageCard} ${styles.collageBottomRight}`}>
                <Image
                  src="https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80"
                  alt="Kitchen interior"
                  fill
                  sizes="(max-width: 900px) 50vw, 12vw"
                  className={styles.coverImage}
                />
              </div>
            </div>

            <div className={styles.introCopy}>
              <SectionLead
                eyebrow="About Andrews"
                title={
                  <>
                    Crafting every home with
                    <br />
                    precision and <span className={styles.highlight}>passion</span>
                  </>
                }
                description="Our goal is clear: 26 beautifully designed single-family homes that redefine modern living in Robbins. Andrews Developments is not just building houses. It is building long-term neighborhood value, comfort, and ownership opportunities for local families."
              />

              <div className={styles.inlineFacts}>
                <div>
                  <span>Location</span>
                  <strong>Robbins, IL</strong>
                </div>
                <div>
                  <span>Homes planned</span>
                  <strong>26 New Builds</strong>
                </div>
                <div>
                  <span>Buyer assistance</span>
                  <strong>Up to $7.5K</strong>
                </div>
              </div>

              <div className={styles.copyCard}>
                <p>
                  <strong>Designed around vision, style, and real-world living.</strong> From practical layouts to
                  finish selections, each home is planned for comfort, durability, and modern day-to-day use.
                </p>
                <a href="#contact" className={styles.textLink}>
                  Request project details
                  <ChevronRight size={16} />
                </a>
              </div>
            </div>
          </div>
        </section>

        <section id="residences" className={styles.section}>
          <div className={styles.container}>
            <SectionLead
              eyebrow="Home designs"
              title={
                <>
                  Three home designs, built
                  <br />
                  for <span className={styles.highlight}>every lifestyle</span>
                </>
              }
              description="Each plan is rooted in the same essentials: 3 bedrooms, 2 baths, approximately 1,588 square feet, open layouts, and modern ranch-style living that balances comfort, convenience, and long-term value."
            />

            <div className={styles.residenceGrid}>
              {residenceCards.map((residence) => (
                <article key={residence.name} className={styles.residenceCard}>
                  <div className={styles.residenceImageWrap}>
                    <Image
                      src={residence.image}
                      alt={residence.name}
                      fill
                      sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 25vw"
                      className={styles.coverImage}
                    />
                  </div>
                  <div className={styles.residenceBody}>
                    <p className={styles.cardEyebrow}>{residence.tag}</p>
                    <h3>{residence.name}</h3>
                    <p>{residence.details}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.floorSection}`}>
          <div className={styles.container}>
            <div className={styles.floorGrid}>
              <div className={styles.floorVisual}>
                <div className={styles.floorPlan}>
                  <div className={`${styles.room} ${styles.roomA}`}>Living</div>
                  <div className={`${styles.room} ${styles.roomB}`}>Suite</div>
                  <div className={`${styles.room} ${styles.roomC}`}>Kitchen</div>
                  <div className={`${styles.room} ${styles.roomD}`}>Bedroom</div>
                  <div className={`${styles.room} ${styles.roomE}`}>Bath</div>
                  <div className={`${styles.room} ${styles.roomF}`}>Terrace</div>
                </div>
              </div>

              <div className={styles.floorCopy}>
                <SectionLead
                  eyebrow="Home features"
                  title={
                    <>
                      Everything you need
                      <br />
                      in <span className={styles.highlight}>one place</span>
                    </>
                  }
                  description="These spacious ranch homes keep residents close to everyday essentials while offering modern layouts, outdoor access, nearby schools, and the kind of straightforward livability that supports long-term homeownership."
                />

                <div className={styles.specGrid}>
                  <div className={styles.specCard}>
                    <BedDouble size={18} />
                    <div>
                      <span>Bedrooms</span>
                      <strong>3 Bedrooms</strong>
                    </div>
                  </div>
                  <div className={styles.specCard}>
                    <Bath size={18} />
                    <div>
                      <span>Bathrooms</span>
                      <strong>2 Bathrooms</strong>
                    </div>
                  </div>
                  <div className={styles.specCard}>
                    <Square size={18} />
                    <div>
                      <span>Interior area</span>
                      <strong>1,588 sq. ft.</strong>
                    </div>
                  </div>
                  <div className={styles.specCard}>
                    <CarFront size={18} />
                    <div>
                      <span>Storage</span>
                      <strong>Smart built-in</strong>
                    </div>
                  </div>
                </div>

                <a href="#contact" className={styles.primaryButton}>
                  Schedule a walkthrough
                  <ArrowUpRight size={16} />
                </a>
              </div>
            </div>
          </div>
        </section>

        <section id="amenities" className={`${styles.section} ${styles.darkSection}`}>
          <div className={`${styles.container} ${styles.darkGrid}`}>
            <div>
              <SectionLead
                eyebrow="Smart home features"
                title={
                  <>
                    Designed for comfort
                    <br />
                    and <span className={styles.highlight}>sustainability</span>
                  </>
                }
                description="Every home is planned for better indoor comfort, healthier living, lower waste, and stronger day-to-day reliability. These are practical upgrades that improve how a home feels and performs."
              />
            </div>

            <div className={styles.amenityGrid}>
              {amenityCards.map((card) => {
                const Icon = card.icon;

                return (
                  <article key={card.title} className={styles.amenityCard}>
                    <span className={styles.amenityIcon}>
                      <Icon size={20} />
                    </span>
                    <h3>{card.title}</h3>
                    <p>{card.text}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.patternSection}`}>
          <div className={styles.container}>
            <SectionLead
              eyebrow="Why families choose Andrews"
              title={
                <>
                  Unrivaled comfort, every
                  <br />
                  step of the <span className={styles.highlight}>journey</span>
                </>
              }
              description="Andrews Developments is focused on more than the house itself. The broader experience matters too: neighborhood quality, smart planning, convenience, and a layout that supports modern households."
            />

            <div className={styles.comfortGrid}>
              {comfortSteps.map((card) => {
                const Icon = card.icon;

                return (
                  <article key={card.title} className={styles.comfortCard}>
                    <span className={styles.comfortIcon}>
                      <Icon size={20} />
                    </span>
                    <h3>{card.title}</h3>
                    <p>{card.text}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={`${styles.container} ${styles.experienceGrid}`}>
            <div className={styles.experienceVisual}>
              <div className={styles.experienceBuilding}>
                <Image
                  src="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1400&q=80"
                  alt="Modern single-family home exterior"
                  fill
                  sizes="(max-width: 1100px) 100vw, 45vw"
                  className={styles.coverImage}
                />
              </div>

              <div className={styles.consultantCard}>
                <div className={styles.consultantPortrait}>
                  <Image
                    src="https://bakedbot.ai/wordpress/andrews/marcus-andrews.jpg"
                    alt="Marcus Andrews portrait"
                    fill
                    sizes="140px"
                    className={styles.coverImage}
                  />
                </div>
                <div className={styles.consultantBody}>
                  <p className={styles.eyebrow}>Founder & CEO</p>
                  <strong>Marcus Andrews</strong>
                  <span>Focused on revitalizing Robbins through strategic, high-quality homebuilding.</span>
                </div>
              </div>
            </div>

            <div>
              <SectionLead
                eyebrow="Experience matters"
                title={
                  <>
                    Meet Marcus Andrews:
                    <br />
                    the developer behind the <span className={styles.highlight}>vision</span>
                  </>
                }
                description="With more than 10 years of experience in real estate development, Marcus Andrews is dedicated to revitalizing Robbins through strategic, high-quality homebuilding that supports community pride, long-term value, and attainable ownership."
              />

              <div className={styles.inlineMetricsWide}>
                <div>
                  <span>Homes planned</span>
                  <strong>26</strong>
                </div>
                <div>
                  <span>Years in development</span>
                  <strong>10+</strong>
                </div>
                <div>
                  <span>Buyer assistance</span>
                  <strong>$7.5K</strong>
                </div>
              </div>

              <div className={styles.copyCard}>
                <p>
                  Talk with the team, schedule a walkthrough, and learn about current availability, financing
                  support, and next steps toward ownership.
                </p>
                <a href="#contact" className={styles.textLink}>
                  Contact Andrews Developments
                  <ChevronRight size={16} />
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.statsBand}>
          <div className={styles.container}>
            <div className={styles.statsHeader}>
              <div>
                <p className={styles.eyebrow}>Project highlights</p>
                <h2 className={styles.bandTitle}>
                  Building long-term value
                  <br />
                  in <span className={styles.highlight}>Robbins</span>
                </h2>
              </div>
              <div className={styles.bandBadge}>26 Homes</div>
            </div>

            <div className={styles.statsGrid}>
              <div>
                <strong>26</strong>
                <span>Single-family homes designed to create ownership opportunities and neighborhood momentum.</span>
              </div>
              <div>
                <strong>3 Bed / 2 Bath</strong>
                <span>Every plan is centered around straightforward ranch-style living that works for families.</span>
              </div>
              <div>
                <strong>1,588 sq. ft.</strong>
                <span>Open layouts, smart storage, and durable finishes balance comfort and long-term value.</span>
              </div>
              <div>
                <strong>$7.5K</strong>
                <span>Eligible buyers can access down payment assistance that makes ownership more achievable.</span>
              </div>
            </div>
          </div>
        </section>

        <section id="team" className={styles.section}>
          <div className={styles.container}>
            <SectionLead
              eyebrow="Our team"
              title={
                <>
                  The team that makes
                  <br />
                  vision into <span className={styles.highlight}>reality</span>
                </>
              }
              description="Behind every Andrews Developments home is a focused, accountable team covering development, operations, legal structure, and in-market real estate support."
            />

            <div className={styles.teamGrid}>
              {team.map((member) => (
                <article key={member.name} className={styles.teamCard}>
                  <div className={styles.teamImageWrap}>
                    <Image
                      src={member.image}
                      alt={member.name}
                      fill
                      sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 25vw"
                      className={styles.coverImage}
                    />
                  </div>
                  <div className={styles.teamBody}>
                    <p className={styles.cardEyebrow}>{member.role}</p>
                    <h3>{member.name}</h3>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.quoteSection}`}>
          <div className={styles.container}>
            <div className={styles.quoteCard}>
              <p className={styles.eyebrow}>Insights from those who know us best</p>
              <blockquote>
                &ldquo;Robbins, IL has gained new life thanks to Marcus Andrews and his development team.&rdquo;
              </blockquote>

              <div className={styles.quoteAuthor}>
                <div className={styles.quoteAvatar}>
                  <Image
                    src="https://bakedbot.ai/wordpress/andrews/marcus-andrews.jpg"
                    alt="Andrews Developments community testimonial"
                    fill
                    sizes="56px"
                    className={styles.coverImage}
                  />
                </div>
                <div>
                  <strong>Community supporter</strong>
                  <span>Robbins, Illinois</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={`${styles.container} ${styles.faqGrid}`}>
            <div className={styles.faqImageWrap}>
              <Image
                src="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1400&q=80"
                alt="Andrews Developments home exterior"
                fill
                sizes="(max-width: 1100px) 100vw, 45vw"
                className={styles.coverImage}
              />
              <div className={styles.faqImageOverlay}>
                <div>
                  <p>Financing support available</p>
                </div>
                <a href="#contact" className={styles.primaryButton}>
                  Book a viewing
                  <ArrowUpRight size={16} />
                </a>
              </div>
            </div>

            <div className={styles.faqPanel}>
              <SectionLead
                eyebrow="Quick answers"
                title={
                  <>
                    Important details before
                    <br />
                    your next <span className={styles.highlight}>step</span>
                  </>
                }
                description="You should not have to decode the buying process. These answers cover the questions Andrews buyers ask first."
              />

              <div className={styles.faqList}>
                {faqItems.map((item, index) => (
                  <details key={item.title} className={styles.faqItem} open={index === 0}>
                    <summary>
                      {item.title}
                      <span>+</span>
                    </summary>
                    <p>{item.body}</p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="stories" className={`${styles.section} ${styles.patternSection}`}>
          <div className={styles.container}>
            <SectionLead
              eyebrow="Get started today"
              title={
                <>
                  Clear next steps toward
                  <br />
                  your <span className={styles.highlight}>new home</span>
                </>
              }
              description="Ownership conversations at Andrews Developments are direct: timeline, financing support, customization, and walkthrough scheduling."
            />

            <div className={styles.storyGrid}>
              {stories.map((story) => (
                <article key={story.title} className={styles.storyCard}>
                  <div className={styles.storyImageWrap}>
                    <Image
                      src={story.image}
                      alt={story.title}
                      fill
                      sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw"
                      className={styles.coverImage}
                    />
                  </div>
                  <div className={styles.storyBody}>
                    <p className={styles.cardEyebrow}>{story.meta}</p>
                    <h3>{story.title}</h3>
                    <p>{story.description}</p>
                    <a href="#contact" className={styles.textLink}>
                      Learn more
                      <ChevronRight size={16} />
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer id="contact" className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerTop}>
            <div>
              <Link href="/" className={styles.brand}>
                <span className={styles.brandMark}>
                  <Building2 size={18} strokeWidth={2.3} />
                </span>
                <span className={styles.brandText}>ANDREWS</span>
              </Link>
              <h2 className={styles.footerHeading}>info@andrewsdevelopments.com</h2>
              <a href="tel:+17085295173" className={styles.footerPhone}>
                (708) 529-5173
              </a>
            </div>

            <div className={styles.footerMeta}>
              <div className={styles.footerMetaItem}>
                <PhoneCall size={18} />
                <span>Schedule a walkthrough or buyer consultation with the Andrews team</span>
              </div>
              <div className={styles.footerMetaItem}>
                <Mail size={18} />
                <span>Availability, financing support, and customization questions answered directly</span>
              </div>
              <div className={styles.footerMetaItem}>
                <MapPin size={18} />
                <span>Robbins, Illinois</span>
              </div>
            </div>
          </div>

          <div className={styles.footerBottom}>
            <div className={styles.socialLinks}>
              <a href="https://facebook.com" aria-label="Visit Facebook">
                <Facebook size={16} />
              </a>
              <a href="https://instagram.com" aria-label="Visit Instagram">
                <Instagram size={16} />
              </a>
              <a href="mailto:info@andrewsdevelopments.com" aria-label="Send email">
                <Mail size={16} />
              </a>
            </div>

            <div className={styles.footerLinks}>
              <a href="#overview">About</a>
              <a href="#residences">Homes</a>
              <a href="#amenities">Features</a>
            </div>

            <p className={styles.copyright}>Copyright {year}. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
