import Image from 'next/image';
import Link from 'next/link';
import { Jost } from 'next/font/google';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowUpRight,
  Bath,
  BedDouble,
  Building2,
  CarFront,
  ChevronRight,
  Clock3,
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

import styles from './inclub-home.module.css';

const jost = Jost({
  subsets: ['latin'],
  variable: '--font-jost',
  weight: ['400', '500', '600', '700'],
});

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
  { label: 'Residences', href: '#residences' },
  { label: 'Amenities', href: '#amenities' },
  { label: 'Team', href: '#team' },
  { label: 'Stories', href: '#stories' },
];

const heroPoster =
  'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1800&q=80';
const heroVideo = 'https://demo.awaikenthemes.com/assets/videos/inclub-video.mp4';

const residenceCards: ResidenceCard[] = [
  {
    name: 'Urban Loft',
    details: '01 Bed / 01 Bath',
    image:
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
    tag: 'From 905 sq. ft.',
  },
  {
    name: 'Sky Villa',
    details: '02 Bed / 02 Bath',
    image:
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
    tag: 'Panoramic terrace',
  },
  {
    name: 'Penthouse',
    details: '03 Bed / 03 Bath',
    image:
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80',
    tag: 'Double-height salon',
  },
  {
    name: 'Town Home',
    details: '04 Bed / 04 Bath',
    image:
      'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80',
    tag: 'Private arrival court',
  },
];

const amenityCards: IconCard[] = [
  {
    icon: ShieldCheck,
    title: 'Private security',
    text: 'Discreet entry control, on-site response, and protected resident access around the clock.',
  },
  {
    icon: Dumbbell,
    title: 'Wellness club',
    text: 'A light-filled training studio, stretch room, recovery lounge, and morning coaching schedule.',
  },
  {
    icon: Waves,
    title: 'Resort pool',
    text: 'Sun shelf, lap lane, shaded cabanas, and evening illumination designed for private events.',
  },
  {
    icon: Trees,
    title: 'Garden promenade',
    text: 'Layered planting, sculptural lighting, and walkable outdoor rooms that slow the pace down.',
  },
  {
    icon: Landmark,
    title: 'Signature lobby',
    text: 'Hotel-inspired arrival with concierge reception, artwork walls, and elevated material detail.',
  },
  {
    icon: Handshake,
    title: 'Resident services',
    text: 'Move-in coordination, housekeeping referrals, pet support, and white-glove delivery handling.',
  },
];

const comfortSteps: IconCard[] = [
  {
    icon: Building2,
    title: 'Architectural presence',
    text: 'Bold massing, softened edges, and a facade calibrated to feel timeless in every season.',
  },
  {
    icon: Sparkles,
    title: 'Tailored finishes',
    text: 'Warm stone, brushed metal, and muted textures selected to age with confidence.',
  },
  {
    icon: KeyRound,
    title: 'Seamless access',
    text: 'Smart entry, valet-ready drop-off, and guest arrival moments that never feel chaotic.',
  },
  {
    icon: Users,
    title: 'Human-centered planning',
    text: 'Circulation, privacy, and shared spaces balanced for day-to-day life instead of brochure fiction.',
  },
  {
    icon: Clock3,
    title: 'Always-on support',
    text: 'Responsive management backed by resident communication that is clear, fast, and accountable.',
  },
  {
    icon: Star,
    title: 'Premium lifestyle',
    text: 'Every touchpoint is refined to feel effortless, from first tour to long-term ownership.',
  },
];

const team: TeamMember[] = [
  {
    name: 'Camila Ross',
    role: 'Sales Director',
    image:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=80',
  },
  {
    name: 'Grace Chen',
    role: 'Design Lead',
    image:
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=900&q=80',
  },
  {
    name: 'Aiden Cole',
    role: 'Development Advisor',
    image:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=80',
  },
  {
    name: 'Samuel Park',
    role: 'Resident Experience',
    image:
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f3d?auto=format&fit=crop&w=900&q=80',
  },
];

const stories: StoryCard[] = [
  {
    title: 'A closer look at the arrival sequence',
    description: 'How the lobby, canopy, and street edge work together to create a stronger first impression.',
    image:
      'https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=1200&q=80',
    meta: 'Design journal',
  },
  {
    title: 'Crafting residences around natural light',
    description: 'Why orientation, glazing, and layered finishes matter more than oversized square footage.',
    image:
      'https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1200&q=80',
    meta: 'Architecture',
  },
  {
    title: 'Evening amenity spaces that actually get used',
    description: 'Programming social rooms, terraces, and wellness zones for real resident behavior.',
    image:
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
    meta: 'Lifestyle',
  },
];

const faqItems = [
  {
    title: 'What residence types are available?',
    body: 'Studios, lofts, two-bedroom layouts, and signature penthouses are available in limited release phases.',
  },
  {
    title: 'Can I book a private presentation?',
    body: 'Yes. We offer one-on-one tours, virtual walkthroughs, and curated visits for overseas buyers.',
  },
  {
    title: 'Are services included for residents?',
    body: 'Concierge support, amenity reservations, and a resident communication desk are included with ownership.',
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

export default function HomePage() {
  const year = new Date().getFullYear();

  return (
    <div className={`${styles.page} ${jost.variable}`}>
      <section id="home" className={styles.hero}>
        <div className={styles.heroMedia}>
          <Image
            src={heroPoster}
            alt="Luxury residential exterior"
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
                <span className={styles.brandText}>INCLUB</span>
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
                  Book a visit
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
            <p className={styles.heroKicker}>Luxury living</p>
            <h1 className={styles.heroTitle}>
              Discover unmatched
              <br />
              style &amp; <span className={styles.highlight}>sophistication</span>
            </h1>
            <p className={styles.heroText}>
              A residential address shaped around quiet confidence, warm materials, and a hotel-grade arrival
              experience from the very first step inside.
            </p>

            <div className={styles.heroActionsRow}>
              <a href="#residences" className={styles.primaryButton}>
                View gallery
                <ArrowUpRight size={16} />
              </a>
              <a href="#overview" className={styles.secondaryButton}>
                Explore details
              </a>
            </div>
          </div>

          <aside className={styles.heroPanel}>
            <div className={styles.heroPanelBlock}>
              <p className={styles.panelLabel}>Liveability score</p>
              <div className={styles.panelMetricRow}>
                <span className={styles.panelMetric}>97%</span>
                <span className={styles.panelHint}>Resident-first planning</span>
              </div>
            </div>

            <div className={styles.heroPanelGrid}>
              <div className={styles.panelCard}>
                <span className={styles.panelCardLabel}>Neighborhood investment</span>
                <strong>$37M</strong>
              </div>
              <div className={styles.panelCard}>
                <span className={styles.panelCardLabel}>Projected yield</span>
                <strong>6.9%</strong>
              </div>
              <div className={styles.panelCard}>
                <span className={styles.panelCardLabel}>Signature residences</span>
                <strong>73</strong>
              </div>
              <div className={styles.panelCard}>
                <span className={styles.panelCardLabel}>Concierge coverage</span>
                <strong>24/7</strong>
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
                eyebrow="About the address"
                title={
                  <>
                    Bringing innovation and
                    <br />
                    heart to <span className={styles.highlight}>every detail</span>
                  </>
                }
                description="Every residence is tuned for modern rituals: calm arrival, generous natural light, deliberate storage, and amenities designed to feel lived in rather than staged."
              />

              <div className={styles.inlineFacts}>
                <div>
                  <span>Prime district</span>
                  <strong>Blue Ridge Summit</strong>
                </div>
                <div>
                  <span>Completion target</span>
                  <strong>Q4 2027</strong>
                </div>
                <div>
                  <span>Starting from</span>
                  <strong>$890K</strong>
                </div>
              </div>

              <div className={styles.copyCard}>
                <p>
                  <strong>Designed for people who notice the difference.</strong> The material palette balances
                  crisp architecture with quieter interior warmth, letting light, volume, and proportion carry the
                  space.
                </p>
                <a href="#contact" className={styles.textLink}>
                  Request the brochure
                  <ChevronRight size={16} />
                </a>
              </div>
            </div>
          </div>
        </section>

        <section id="residences" className={styles.section}>
          <div className={styles.container}>
            <SectionLead
              eyebrow="Available layouts"
              title={
                <>
                  Apartment styles to fit
                  <br />
                  <span className={styles.highlight}>your lifestyle</span>
                </>
              }
              description="From compact city-ready layouts to family-scale residences, each plan keeps the same design language: volume, privacy, and a strong connection to natural light."
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
                  eyebrow="Floor plan preview"
                  title={
                    <>
                      All you need to know
                      <br />
                      about this <span className={styles.highlight}>property</span>
                    </>
                  }
                  description="A balanced two-bedroom plan with open entertaining space, private sleeping quarters, and a terrace wide enough for dining and evening hosting."
                />

                <div className={styles.specGrid}>
                  <div className={styles.specCard}>
                    <BedDouble size={18} />
                    <div>
                      <span>Bedrooms</span>
                      <strong>2 Suites</strong>
                    </div>
                  </div>
                  <div className={styles.specCard}>
                    <Bath size={18} />
                    <div>
                      <span>Bathrooms</span>
                      <strong>2.5 Baths</strong>
                    </div>
                  </div>
                  <div className={styles.specCard}>
                    <Square size={18} />
                    <div>
                      <span>Interior area</span>
                      <strong>1,985 sq. ft.</strong>
                    </div>
                  </div>
                  <div className={styles.specCard}>
                    <CarFront size={18} />
                    <div>
                      <span>Parking</span>
                      <strong>2 Reserved</strong>
                    </div>
                  </div>
                </div>

                <a href="#contact" className={styles.primaryButton}>
                  Schedule a presentation
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
                eyebrow="Amenities"
                title={
                  <>
                    Apartment tailored to
                    <br />
                    your <span className={styles.highlight}>highest standards</span>
                  </>
                }
                description="The amenity program is built to support the whole day, from structured wellness and private hosting to concierge-backed convenience that removes daily friction."
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
              eyebrow="Why residents choose it"
              title={
                <>
                  Unmatched comfort, every
                  <br />
                  step of the <span className={styles.highlight}>way</span>
                </>
              }
              description="From the architectural shell to the resident communication layer, the project is designed to feel coherent, calm, and operationally sharp."
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
                  src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1400&q=80"
                  alt="Residential tower with consultant portrait"
                  fill
                  sizes="(max-width: 1100px) 100vw, 45vw"
                  className={styles.coverImage}
                />
              </div>

              <div className={styles.consultantCard}>
                <div className={styles.consultantPortrait}>
                  <Image
                    src="https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=900&q=80"
                    alt="Senior property consultant"
                    fill
                    sizes="140px"
                    className={styles.coverImage}
                  />
                </div>
                <div className={styles.consultantBody}>
                  <p className={styles.eyebrow}>Lead consultant</p>
                  <strong>Sophia Bennett</strong>
                  <span>12+ years in luxury residential advisory and off-market buyer strategy.</span>
                </div>
              </div>
            </div>

            <div>
              <SectionLead
                eyebrow="Experience matters"
                title={
                  <>
                    50 years&apos; experience in
                    <br />
                    the <span className={styles.highlight}>real estate</span> sector
                  </>
                }
                description="The team behind the address combines sales, development, hospitality, and resident operations so the project performs after launch, not just during marketing."
              />

              <div className={styles.inlineMetricsWide}>
                <div>
                  <span>Transactions led</span>
                  <strong>320+</strong>
                </div>
                <div>
                  <span>Projects delivered</span>
                  <strong>58</strong>
                </div>
                <div>
                  <span>Resident satisfaction</span>
                  <strong>96%</strong>
                </div>
              </div>

              <div className={styles.copyCard}>
                <p>
                  The sales process is intentionally direct: private briefing, honest unit guidance, and fast
                  answers on availability, pricing, finishes, and projected ownership costs.
                </p>
                <a href="#contact" className={styles.textLink}>
                  Speak with the team
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
                <p className={styles.eyebrow}>The residence</p>
                <h2 className={styles.bandTitle}>
                  The residences at Blue
                  <br />
                  <span className={styles.highlight}>Ridge Summit</span>
                </h2>
              </div>
              <div className={styles.bandBadge}>Since 1975</div>
            </div>

            <div className={styles.statsGrid}>
              <div>
                <strong>4,385 sq. ft.</strong>
                <span>Largest private penthouse with wraparound entertaining terrace and skyline outlook.</span>
              </div>
              <div>
                <strong>37M</strong>
                <span>District investment fueling retail, mobility, and new hospitality activity nearby.</span>
              </div>
              <div>
                <strong>6.9%</strong>
                <span>Projected premium rental yield for select residences in the current launch phase.</span>
              </div>
              <div>
                <strong>24/7</strong>
                <span>Concierge and resident support coverage for arrivals, deliveries, and daily requests.</span>
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
                  The professionals behind
                  <br />
                  every <span className={styles.highlight}>success</span>
                </>
              }
              description="A compact senior team handles sales, design, development, and resident experience so the message and the product stay aligned."
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
              <p className={styles.eyebrow}>Hear it from residents</p>
              <blockquote>
                &ldquo;The material quality, lobby arrival, and day-to-day service all feel considered. It reads as
                premium because the operational details are premium too.&rdquo;
              </blockquote>

              <div className={styles.quoteAuthor}>
                <div className={styles.quoteAvatar}>
                  <Image
                    src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80"
                    alt="Resident portrait"
                    fill
                    sizes="56px"
                    className={styles.coverImage}
                  />
                </div>
                <div>
                  <strong>Janelle Morris</strong>
                  <span>Resident owner since 2024</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={`${styles.container} ${styles.faqGrid}`}>
            <div className={styles.faqImageWrap}>
              <Image
                src="https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1400&q=80"
                alt="Elegant residential facade"
                fill
                sizes="(max-width: 1100px) 100vw, 45vw"
                className={styles.coverImage}
              />
              <div className={styles.faqImageOverlay}>
                <div>
                  <p>Private brochure available</p>
                </div>
                <a href="#contact" className={styles.primaryButton}>
                  Download now
                  <ArrowUpRight size={16} />
                </a>
              </div>
            </div>

            <div className={styles.faqPanel}>
              <SectionLead
                eyebrow="Any questions?"
                title={
                  <>
                    A smarter, clearer
                    <br />
                    path to <span className={styles.highlight}>ownership</span>
                  </>
                }
                description="You should not have to decode the buying process. The answers below cover the questions serious buyers ask first."
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
              eyebrow="Stories & insights"
              title={
                <>
                  Strategic updates from
                  <br />
                  the <span className={styles.highlight}>studio</span>
                </>
              }
              description="A mix of design notes, planning rationale, and market perspective behind the project."
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
                      Read more
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
                <span className={styles.brandText}>INCLUB</span>
              </Link>
              <h2 className={styles.footerHeading}>info@domainname.com</h2>
              <a href="tel:+1654787235" className={styles.footerPhone}>
                +1 (654) 787 235
              </a>
            </div>

            <div className={styles.footerMeta}>
              <div className={styles.footerMetaItem}>
                <PhoneCall size={18} />
                <span>Monday to Saturday, 9:00 AM to 7:00 PM</span>
              </div>
              <div className={styles.footerMetaItem}>
                <Mail size={18} />
                <span>Private presentations, brochure requests, and investor briefings</span>
              </div>
              <div className={styles.footerMetaItem}>
                <MapPin size={18} />
                <span>1450 Westlake Avenue, Blue Ridge Summit, USA</span>
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
              <a href="mailto:info@domainname.com" aria-label="Send email">
                <Mail size={16} />
              </a>
            </div>

            <div className={styles.footerLinks}>
              <a href="#overview">About Us</a>
              <a href="#amenities">Amenities</a>
              <a href="#stories">Resources</a>
            </div>

            <p className={styles.copyright}>Copyright {year}. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
