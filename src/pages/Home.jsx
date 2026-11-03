import { useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform, useMotionValue, useSpring, useMotionValueEvent } from 'framer-motion';
import { SiteDataContext } from '../App';
import SafeImage from '../components/SafeImage';
import VisualEditable from '../components/VisualEditor/VisualEditable';
import PageBlockList from '../components/VisualEditor/PageBlockList';

// Layout and motion inspired by acmvit.in. No photos yet (chapter just launched):
// visuals: KL drone footage in the hero, SVG cassettes, gradient art.

const ease = [0.16, 1, 0.3, 1];
// Graded web cuts of the KL drone footage (sources: raw-assets/KL Aerial View, not shipped)
const MEDIA = `${import.meta.env.BASE_URL}media`;

// ACM Code of Ethics, section 1 (General Ethical Principles), abbreviated
const ETHICS = [
  'Contribute to society and to human well-being',
  'Avoid harm',
  'Be honest and trustworthy',
  'Be fair and take action not to discriminate',
  'Respect the work required to produce new ideas',
  'Respect privacy',
  'Honor confidentiality'
];

const DEFAULT_ACTIVITIES = [
  'Technical Workshops on Web Dev, AI/ML, Cloud Computing',
  'National-level Hackathons and Competitive Programming Contests',
  'Collaborative Research projects and Paper Presentations',
  'Mentorship sessions by alumni and industry experts'
];
const DOMAIN_GLOWS = ['#D32A38', '#0093D3', '#D32A38', '#0093D3'];

// Line slides up from behind its mask. The mask is what's observed: the inner span
// starts fully clipped, so observing it directly would never report "in view".
function Line({ children, delay = 0 }) {
  return (
    <motion.span className="mask" initial="hide" whileInView="show" viewport={{ once: true, amount: 0.5 }}>
      <motion.span variants={{ hide: { y: '105%' }, show: { y: 0, transition: { duration: 1, delay, ease } } }}>
        {children}
      </motion.span>
    </motion.span>
  );
}

const Fade = ({ children, delay = 0, className, style }) => (
  <motion.div className={className} style={style} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.9, delay, ease }}>
    {children}
  </motion.div>
);

// Retro cassette drawn in SVG; reels spin via CSS
function Cassette({ label, color = '#D32A38' }) {
  return (
    <svg viewBox="0 0 320 200" className="cassette" aria-hidden="true">
      <rect x="2" y="2" width="316" height="196" rx="14" fill="#F4F1EA" stroke="#111214" strokeWidth="3" />
      {[18, 302].map(cx => [18, 182].map(cy => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="4" fill="none" stroke="#111214" strokeWidth="1.5" />))}
      <rect x="24" y="20" width="272" height="100" rx="8" fill="#fff" stroke="#111214" strokeWidth="2" />
      <path d="M24 28a8 8 0 0 1 8-8h256a8 8 0 0 1 8 8v14H24z" fill={color} />
      <text x="36" y="36" fontFamily="'Geist Mono', monospace" fontSize="11" fill="#fff" letterSpacing="1.5">{label}</text>
      {[54, 62].map(y => <line key={y} x1="36" y1={y} x2="284" y2={y} stroke={color} strokeWidth="3" strokeOpacity=".85" />)}
      <rect x="86" y="72" width="148" height="38" rx="19" fill="#111214" />
      {[110, 210].map(cx => (
        <g key={cx} className="reel">
          <circle cx={cx} cy="91" r="15" fill="#F4F1EA" />
          {[0, 60, 120].map(a => <rect key={a} x={cx - 1.5} y="78" width="3" height="26" fill="#111214" transform={`rotate(${a} ${cx} 91)`} />)}
          <circle cx={cx} cy="91" r="5" fill="#111214" />
        </g>
      ))}
      <path d="M64 198 L86 146 H234 L256 198" fill="none" stroke="#111214" strokeWidth="2" />
      {[112, 148, 172, 208].map(cx => <circle key={cx} cx={cx} cy="176" r="5" fill="none" stroke="#111214" strokeWidth="1.5" />)}
    </svg>
  );
}

const daysUntil = (d) => Math.ceil((new Date(d).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000);

// One event: wipes in, line draws, date flips, title rises; art tilts toward the cursor on hover
function EventRow({ e, i }) {
  const d = new Date(e.date);
  const days = daysUntil(e.date);
  const upcoming = days >= 0;
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const tiltX = useSpring(rx, { stiffness: 150, damping: 15 });
  const tiltY = useSpring(ry, { stiffness: 150, damping: 15 });
  const onMove = (ev) => {
    const r = ev.currentTarget.getBoundingClientRect();
    ry.set(((ev.clientX - r.left) / r.width - 0.5) * 18);
    rx.set(-((ev.clientY - r.top) / r.height - 0.5) * 14);
  };
  const reset = () => { rx.set(0); ry.set(0); };
  const show = { hide: {}, show: {} };

  return (
    <motion.div initial="hide" whileInView="show" viewport={{ once: true, amount: 0.35 }} variants={show} transition={{ staggerChildren: 0.09, delayChildren: i * 0.08 }}>
      <Link to="/Events" className="ev-row">
        <motion.span className="ev-line" variants={{ hide: { scaleX: 0 }, show: { scaleX: 1, transition: { duration: 1.1, ease } } }} />
        <motion.div
          className="ev-art-wrap"
          variants={{ hide: { clipPath: 'inset(0 100% 0 0)' }, show: { clipPath: 'inset(0 0% 0 0)', transition: { duration: 0.9, ease } } }}
          onMouseMove={onMove}
          onMouseLeave={reset}
        >
          <motion.div className="event-art" style={{ rotateX: tiltX, rotateY: tiltY }}>
            {e.image_url
              ? <SafeImage src={e.image_url} alt={e.title} fit="cover" />
              : (
                <motion.div className="d" variants={{ hide: { rotateX: 90, opacity: 0 }, show: { rotateX: 0, opacity: 1, transition: { duration: 0.8, ease, delay: 0.3 } } }}>
                  {d.getDate()}<small>{d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()}</small>
                </motion.div>
              )}
            <span className="ev-shine" />
          </motion.div>
        </motion.div>
        <div style={{ minWidth: 0 }}>
          <motion.div className="mono ev-meta" variants={{ hide: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
            <span className={`ev-badge${upcoming ? ' live' : ''}`}><i />{upcoming ? (days === 0 ? 'Today' : `Upcoming · in ${days} day${days === 1 ? '' : 's'}`) : 'Past event'}</span>
            <span>{d.toLocaleDateString('en-US', { dateStyle: 'medium' })}{e.venue ? ` · ${e.venue}` : ''}</span>
          </motion.div>
          <h3 className="ev-title">
            <span className="mask"><motion.span variants={{ hide: { y: '110%' }, show: { y: 0, transition: { duration: 0.9, ease } } }}>{e.title}</motion.span></span>
          </h3>
          {e.speaker && <motion.div className="mono" style={{ marginTop: '10px' }} variants={{ hide: { opacity: 0 }, show: { opacity: 1 } }}>with {e.speaker}</motion.div>}
        </div>
        <motion.span className="pill-btn ghost ev-cta" variants={{ hide: { opacity: 0, x: 20 }, show: { opacity: 1, x: 0 } }}>Details <span className="ev-arrow">→</span></motion.span>
      </Link>
    </motion.div>
  );
}

export default function Home() {
  const { siteData } = useContext(SiteDataContext);
  // Animations always play, even with macOS/iOS 'Reduce motion' on (site owner's choice)
  const reduce = false;
  const homeData = siteData?.pages?.home?.content || {};
  const chapterData = siteData?.pages?.['about-klef-acm']?.content || {};
  const acmData = siteData?.pages?.['about-acm']?.content || {};
  const events = (siteData?.events || []).filter(e => e.is_published);
  const activities = Array.isArray(chapterData.activities) && chapterData.activities.length ? chapterData.activities : DEFAULT_ACTIVITIES;

  const about = [
    { tape: 'ABOUT KLEF ACM', color: '#D32A38', title: 'KLEF ACM', text: chapterData.introduction || 'The ACM Student Chapter at KL Deemed to be University, under the Department of Computer Science & Engineering.' },
    { tape: 'ABOUT KL UNIVERSITY', color: '#111214', title: 'KL University', text: 'Koneru Lakshmaiah Education Foundation — KL Deemed to be University — at the Green Fields campus in Vaddeswaram, Andhra Pradesh.' },
    { tape: 'ABOUT ACM', color: '#0093D3', title: 'ACM', text: acmData.intro || 'The Association for Computing Machinery is the world’s largest educational and scientific computing society.' }
  ];

  // --- Hero: pinned; scrolling shrinks the full-bleed drone video into a rounded frame
  // while the headline lifts away and a caption arrives. Values are set from a JS listener
  // (not useTransform) so framer can't hand them to a native ScrollTimeline that resets them.
  const heroRef = useRef(null);
  const { scrollYProgress: heroP } = useScroll({ target: heroRef, offset: ['start start', 'end end'] });
  const vClip = useMotionValue('inset(0% 0% 0% 0% round 0px)');
  const vScale = useMotionValue(1);
  const shadeOpacity = useMotionValue(1);
  const titleY = useMotionValue(0);
  const titleOpacity = useMotionValue(1);
  const captionOpacity = useMotionValue(0);
  const captionY = useMotionValue(24);
  useMotionValueEvent(heroP, 'change', p => {
    const t = Math.min(1, Math.max(0, p / 0.75));
    const e = 1 - Math.pow(1 - t, 3); // ease-out
    vClip.set(`inset(${14 * e}% ${7 * e}% ${14 * e}% ${7 * e}% round ${28 * e}px)`);
    vScale.set(1 + 0.12 * e);
    shadeOpacity.set(1 - 0.6 * e);
    titleY.set(-120 * e);
    titleOpacity.set(Math.max(0, 1 - t * 1.8));
    const c = Math.min(1, Math.max(0, (t - 0.55) / 0.45));
    captionOpacity.set(c);
    captionY.set(24 * (1 - c));
  });
  const videoRef = useRef(null);
  const [videoPaused, setVideoPaused] = useState(false);
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    // React doesn't write the `muted` attribute; Safari/iOS need it to allow autoplay
    v.muted = true;
    v.setAttribute('muted', '');
    v.play().catch(() => setVideoPaused(true)); // e.g. iOS Low Power Mode: show poster + play button
  }, []);
  const toggleVideo = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play().then(() => setVideoPaused(false)).catch(() => {}); } else { v.pause(); setVideoPaused(true); }
  };

  // --- About: pinned, steps through three tapes
  const aboutRef = useRef(null);
  const { scrollYProgress: aboutP } = useScroll({ target: aboutRef, offset: ['start start', 'end end'] });
  const [aboutIdx, setAboutIdx] = useState(0);
  useMotionValueEvent(aboutP, 'change', v => setAboutIdx(Math.min(about.length - 1, Math.floor(v * about.length))));

  // --- Domains: vertical scroll drives a horizontal track
  const domRef = useRef(null);
  const trackRef = useRef(null);
  const [dist, setDist] = useState(0);
  useLayoutEffect(() => {
    const measure = () => setDist(Math.max(0, (trackRef.current?.scrollWidth || 0) - window.innerWidth + 48));
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [activities.length]);
  const { scrollYProgress: domP } = useScroll({ target: domRef, offset: ['start start', 'end end'] });
  const trackX = useTransform(domP, [0, 1], [0, -dist]);

  // --- Events: pill zooms until it fills the screen
  const evRef = useRef(null);
  const { scrollYProgress: evP } = useScroll({ target: evRef, offset: ['start start', 'end end'] });
  const pillScale = useTransform(evP, [0.12, 0.88], [1, 14]);
  // Set from a JS listener on purpose: values derived straight from useScroll can be handed to a
  // native ScrollTimeline, which resets them once you scroll past the end of the range.
  const evFade = useMotionValue(0);
  const hintOpacity = useMotionValue(1);
  useMotionValueEvent(evP, 'change', v => {
    evFade.set(Math.min(1, Math.max(0, (v - 0.5) / 0.25)));
    hintOpacity.set(Math.min(1, Math.max(0, 1 - (v - 0.15) / 0.2)));
  });
  const gridShift = useTransform(evP, [0, 1], ['0px 0px', '0px -420px']);

  useEffect(() => { document.body.classList.add('home-page'); return () => document.body.classList.remove('home-page'); }, []);

  return (
    <div>
      {/* ================= HERO (dark) ================= */}
      <section ref={heroRef} className="vhero-pin" style={reduce ? { height: 'auto' } : undefined}>
        <div className="vhero dark">
          <motion.div className="hero-video" aria-hidden="true" style={reduce ? undefined : { clipPath: vClip }}>
            <motion.video ref={videoRef} autoPlay muted loop playsInline preload="auto" poster={`${MEDIA}/kl-aerial-poster.jpg`} style={reduce ? undefined : { scale: vScale }}>
              <source src={`${MEDIA}/kl-aerial-mobile.mp4`} type="video/mp4" media="(max-width: 700px) and (orientation: portrait)" />
              <source src={`${MEDIA}/kl-aerial.mp4`} type="video/mp4" />
            </motion.video>
            <motion.div className="hero-shade" style={reduce ? undefined : { opacity: shadeOpacity }} />
          </motion.div>
          <button type="button" className="video-toggle" onClick={toggleVideo} aria-label={videoPaused ? 'Play background video' : 'Pause background video'}>
            {videoPaused ? '▶' : '❚❚'}
          </button>
          <div className="vglow red" />
          <div className="vglow blue" />

          <motion.div className="container" style={reduce ? undefined : { y: titleY, opacity: titleOpacity }}>
            <h1 className="vhero-title">
              <Line><span className="t-red">we don’t just</span></Line>
              <Line delay={0.08}>learn computing.</Line>
              <Line delay={0.16}>we build it.</Line>
            </h1>
            <Fade delay={0.4} style={{ marginTop: '36px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Link to="/Events" className="pill-btn">Explore events →</Link>
              <Link to="/Members" className="pill-btn ghost">Meet the team</Link>
            </Fade>
          </motion.div>

          {!reduce && (
            <motion.div className="hero-caption" style={{ opacity: captionOpacity, y: captionY }} aria-hidden="true">
              <span className="mono">KL University · Green Fields, Vaddeswaram</span>
              <strong>Home of KLEF ACM</strong>
            </motion.div>
          )}

          <motion.div className="container vhero-foot mono" style={reduce ? undefined : { opacity: titleOpacity }}>
            <span>KLEF ACM Student Chapter.<br /><b>Just getting started.</b></span>
            <span style={{ textAlign: 'right' }}>We’re not just another <b>tech club</b>.<br />We’re a community that <b>builds</b>.</span>
          </motion.div>
        </div>
      </section>

      {/* ================= ABOUT (light, pinned) ================= */}
      <section ref={aboutRef} className="pin-wrap" style={{ height: reduce ? 'auto' : `${about.length * 100}vh` }}>
        <div className="pin-stage" style={reduce ? { position: 'relative', height: 'auto', padding: '120px 0' } : undefined}>
          <div className="container about-grid">
            <div>
              <div className="o-kicker">About · 0{aboutIdx + 1}/0{about.length}</div>
              <div className="about-panels">
                <AnimatePresence mode="wait">
                  <motion.div key={aboutIdx} className="about-panel" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} transition={{ duration: 0.5, ease }}>
                    <h2 className="giant" style={{ marginBottom: '24px' }}>{about[aboutIdx].title}</h2>
                    <p className="lead" style={{ maxWidth: '520px', color: 'var(--muted)' }}>{about[aboutIdx].text}</p>
                  </motion.div>
                </AnimatePresence>
              </div>
              <div className="about-dots">{about.map((_, i) => <span key={i} className={i === aboutIdx ? 'on' : ''} />)}</div>
            </div>
            <div className="tape-stack">
              {about.map((a, i) => {
                const pos = (i - aboutIdx + about.length) % about.length; // 0 = front
                return (
                  <motion.div
                    key={a.tape}
                    animate={{ x: `${pos * 9}%`, y: `${pos * 12}%`, rotate: pos === 0 ? -6 : 4 + pos * 5, scale: 1 - pos * 0.06, opacity: pos === 0 ? 1 : 0.55 }}
                    transition={{ duration: 0.7, ease }}
                    style={{ zIndex: about.length - pos, left: '6%', top: '4%' }}
                  >
                    <Cassette label={a.tape} color={a.color} />
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ================= VISION / MISSION / ETHICS (light) ================= */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="values">
            <div>
              <h2 className="giant" style={{ marginBottom: '24px' }}><Line>Our</Line><Line delay={0.08}><span className="t-red">Vision</span></Line></h2>
              <Fade><p className="lead" style={{ maxWidth: '520px', color: 'var(--muted)' }}>{chapterData.vision || 'To create an environment of computational excellence, innovation and peer-to-peer mentorship.'}</p></Fade>
            </div>
            <div>
              <h2 className="giant" style={{ marginBottom: '24px' }}><Line>Our</Line><Line delay={0.08}><span className="t-blue">Mission</span></Line></h2>
              <Fade><p className="lead" style={{ maxWidth: '520px', color: 'var(--muted)' }}>{chapterData.mission || 'To provide students with technical exposure, workshops, research guidance and competitive challenges.'}</p></Fade>
            </div>
            <div>
              <h2 className="display-title"><Line>Code of</Line><Line delay={0.08}><span className="t-red">conduct</span></Line></h2>
              <p className="mono" style={{ marginTop: '18px', color: 'var(--muted)', maxWidth: '420px' }}>Our values are grounded in the ACM Code of Ethics and Professional Conduct.</p>
            </div>
            <div>
              <ul className="ethics">
                {ETHICS.map((e, i) => (
                  <Fade key={e} delay={i * 0.04}><li><span>1.{i + 1}</span>{e}</li></Fade>
                ))}
              </ul>
              <a href="https://www.acm.org/code-of-ethics" target="_blank" rel="noopener noreferrer" className="text-link" style={{ marginTop: '24px' }}>Read the ACM Code of Ethics ↗</a>
            </div>
          </div>
        </div>
      </section>

      {/* ================= DOMAINS (dark, horizontal) ================= */}
      <section ref={domRef} className="dark dotted" style={{ height: reduce ? 'auto' : `calc(100vh + ${dist}px)` }}>
        <div className="pin-stage" style={{ flexDirection: 'column', alignItems: 'stretch', justifyContent: 'center', ...(reduce ? { position: 'relative', height: 'auto', padding: '100px 0' } : {}) }}>
          <div className="container" style={{ marginBottom: '40px' }}>
            <div className="o-kicker" style={{ color: '#FF5A62' }}>What we do</div>
            <h2 className="display-title" style={{ color: '#fff', maxWidth: '900px' }}>Every domain is a <span className="t-red" style={{ color: '#FF5A62' }}>mindset</span>.</h2>
          </div>
          <motion.div ref={trackRef} className="hscroll-track" style={{ x: reduce ? 0 : trackX, flexWrap: reduce ? 'wrap' : 'nowrap' }}>
            {activities.map((a, i) => (
              <div key={i} className="domain-card">
                <div className="art" style={{ background: DOMAIN_GLOWS[i % DOMAIN_GLOWS.length] }} />
                <span className="num">0{i + 1} /</span>
                <h3>{String(a)}</h3>
                <Link to="/Events" className="text-link" style={{ color: '#EDEDEA', alignSelf: 'flex-start' }}>Explore →</Link>
              </div>
            ))}
            <div className="domain-card" style={{ background: 'var(--kl-red)', borderColor: 'transparent' }}>
              <span className="num" style={{ color: '#fff' }}>+ more /</span>
              <h3>Your idea could be next</h3>
              <Link to="/Contact" className="text-link" style={{ color: '#fff', alignSelf: 'flex-start' }}>Pitch it →</Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ================= EVENTS: pill zoom ================= */}
      <section ref={evRef} className="events-pin" style={reduce ? { height: 'auto' } : undefined}>
        <motion.div className="events-stage" style={reduce ? { position: 'relative', height: '70vh' } : { backgroundPosition: gridShift }}>
          <motion.div className="events-pill" style={{ scale: reduce ? 1 : pillScale, willChange: 'auto' /* re-raster each frame so zoomed text stays sharp */ }} aria-label="Events"
            initial="hide" whileInView="show" viewport={{ once: true, amount: 0.6 }} transition={{ staggerChildren: 0.07 }}>
            {'EVENTS'.split('').map((c, i) => (
              <motion.span key={i} variants={{ hide: { y: -40, opacity: 0, rotate: -12 }, show: { y: 0, opacity: 1, rotate: 0, transition: { type: 'spring', stiffness: 260, damping: 16 } } }}>{c}</motion.span>
            ))}
          </motion.div>
          {!reduce && <motion.span className="events-hint mono" style={{ opacity: hintOpacity }}>Scroll ↓</motion.span>}
          {!reduce && <motion.div className="events-fade" style={{ opacity: evFade }} />}
        </motion.div>
      </section>
      <section className="dark" style={{ padding: '40px 0 clamp(80px, 10vw, 140px)', ...(reduce ? {} : { marginTop: '-38vh', position: 'relative', zIndex: 1, background: 'transparent' }) }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' }}>
            <h2 className="display-title" style={{ color: '#fff' }}><Line>Beyond the</Line><Line delay={0.08}><span style={{ color: '#FF5A62' }}>classroom</span></Line></h2>
            <Link to="/Events" className="pill-btn">All events →</Link>
          </div>
          {events.length === 0 && <p className="mono" style={{ padding: '40px 0' }}>Our first events are on the way. Stay tuned.</p>}
          {events.slice(0, 4).map((e, i) => <EventRow key={e.id} e={e} i={i} />)}
        </div>
      </section>

      {/* ================= MARQUEE (dark) ================= */}
      <section className="dark marquee" aria-hidden="true">
        <div className="marquee-track editorial-marquee-track">
          {Array.from({ length: 4 }).flatMap((_, k) => ['Learn.', 'Build.', 'Lead.'].map(w => <span key={`${k}-${w}`}>{w}</span>))}
        </div>
      </section>

      {/* ================= SAY HELLO (light) ================= */}
      <section className="section">
        <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px', alignItems: 'end' }}>
          <h2 className="giant"><Line>Say</Line><Line delay={0.08}><span className="t-red">hello</span></Line></h2>
          <Fade>
            <VisualEditable
              name="hero_description"
              as="p"
              className="lead"
              defaultValue={homeData.hero_description || 'A community of students and faculty at KL University advancing computing through workshops, research, hackathons and competitive programming.'}
              style={{ maxWidth: '520px', color: 'var(--muted)', marginBottom: '28px' }}
            />
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Link to="/Join" className="pill-btn">Join the chapter →</Link>
              <Link to="/About-KLEF-ACM" className="pill-btn ghost">About us</Link>
            </div>
          </Fade>
        </div>
      </section>

      {/* Free-form CMS blocks */}
      <div className="container">
        <PageBlockList blockKey="home_blocks" style={{ margin: '32px 0' }} />
      </div>
    </div>
  );
}
