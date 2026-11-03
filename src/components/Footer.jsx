import { Link } from 'react-router-dom';

export default function Footer({ contact = {} }) {
  const currentYear = new Date().getFullYear();

  // Hide placeholder defaults to avoid displaying fake info
  const email = contact.email && contact.email !== 'acm.studentchapter@kluniversity.in' ? contact.email : '';
  const phone = contact.phone && contact.phone !== '+91 86323 99999' ? contact.phone : '';
  const socialLinks = contact.social_links || {};

  const hasSocials = socialLinks.linkedin || socialLinks.instagram || socialLinks.github;

  return (
    <footer className="footer" style={{ borderTop: '1px solid #E6EBF2', backgroundColor: '#FFFFFF', color: '#475569', padding: '72px 0 36px 0' }}>
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1.2fr 1fr', gap: '48px', marginBottom: '48px' }} className="footer-grid">
          {/* Col 1: Chapter Details & Address */}
          <div>
            <div className="footer-logo-plate">
              <img src={`${import.meta.env.BASE_URL}brand/klef-acm-logo.png`} alt="KL University × KLEF ACM Student Chapter" />
            </div>
            <h3 style={{ color: 'var(--navy-900)', fontSize: '1.15rem', fontWeight: '800', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              KLEF ACM Student Chapter
            </h3>
            <p style={{ fontSize: '0.78rem', fontWeight: '700', color: '#0093D3', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '14px' }}>
              Association for Computing Machinery
            </p>
            <p style={{ fontSize: '0.85rem', lineHeight: '1.65', color: '#475569' }}>
              KLEF Deemed to be University,<br />
              Green Fields, Vaddeswaram,<br />
              Guntur District, A.P., INDIA.<br />
              Pincode : 522 302.
            </p>
          </div>

          {/* Col 2: Quick Links */}
          <div>
            <h4 style={{ color: 'var(--navy-900)', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '20px' }}>
              Quick Links
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.86rem' }}>
              <li><Link to="/" style={{ color: '#475569', textDecoration: 'none', transition: 'color 0.18s' }}>Home</Link></li>
              <li><Link to="/Events" style={{ color: '#475569', textDecoration: 'none', transition: 'color 0.18s' }}>Events</Link></li>
              <li><Link to="/Gallery" style={{ color: '#475569', textDecoration: 'none', transition: 'color 0.18s' }}>Gallery</Link></li>
              <li><Link to="/Members" style={{ color: '#475569', textDecoration: 'none', transition: 'color 0.18s' }}>Members</Link></li>
              <li><Link to="/About-ACM" style={{ color: '#475569', textDecoration: 'none', transition: 'color 0.18s' }}>About ACM</Link></li>
              <li><Link to="/About-KLEF-ACM" style={{ color: '#475569', textDecoration: 'none', transition: 'color 0.18s' }}>About KLEF ACM</Link></li>
              <li><Link to="/Contact" style={{ color: '#475569', textDecoration: 'none', transition: 'color 0.18s' }}>Contact</Link></li>
              <li><Link to="/Join" style={{ color: '#475569', textDecoration: 'none', transition: 'color 0.18s' }}>Join the Chapter</Link></li>
            </ul>
          </div>

          {/* Col 3: Official ACM Links */}
          <div>
            <h4 style={{ color: 'var(--navy-900)', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '20px' }}>
              Official ACM Links
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.86rem' }}>
              <li><a href="https://www.acm.org" target="_blank" rel="noopener noreferrer" style={{ color: '#475569', textDecoration: 'none', transition: 'color 0.18s' }}>ACM Official Website</a></li>
              <li><a href="https://www.acm.org/about-acm/about-the-association-for-computing-machinery" target="_blank" rel="noopener noreferrer" style={{ color: '#475569', textDecoration: 'none', transition: 'color 0.18s' }}>ACM About</a></li>
              <li><a href="https://dl.acm.org" target="_blank" rel="noopener noreferrer" style={{ color: '#475569', textDecoration: 'none', transition: 'color 0.18s' }}>ACM Digital Library</a></li>
              <li><a href="https://www.acm.org/chapters" target="_blank" rel="noopener noreferrer" style={{ color: '#475569', textDecoration: 'none', transition: 'color 0.18s' }}>ACM Chapters</a></li>
              <li><a href="https://www.acm.org/membership" target="_blank" rel="noopener noreferrer" style={{ color: '#475569', textDecoration: 'none', transition: 'color 0.18s' }}>ACM Membership</a></li>
              <li><a href="https://www.acm.org/code-of-ethics" target="_blank" rel="noopener noreferrer" style={{ color: '#475569', textDecoration: 'none', transition: 'color 0.18s' }}>ACM Code of Ethics</a></li>
            </ul>
          </div>

          {/* Col 4: Chapter Contacts */}
          <div>
            {(email || phone || hasSocials) && (
              <>
                <h4 style={{ color: 'var(--navy-900)', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '20px' }}>
                  Chapter Connection
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.86rem', color: '#475569' }}>
                  {email && (
                    <div>
                      <span style={{ display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748B', marginBottom: '2px' }}>Email</span>
                      <a href={`mailto:${email}`} style={{ color: '#0F172A', textDecoration: 'none' }}>{email}</a>
                    </div>
                  )}
                  {phone && (
                    <div>
                      <span style={{ display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748B', marginBottom: '2px' }}>Phone</span>
                      <a href={`tel:${phone.replace(/[^+\d]/g, '')}`} style={{ color: '#0F172A', textDecoration: 'none' }}>{phone}</a>
                    </div>
                  )}
                  {hasSocials && (
                    <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                      {socialLinks.linkedin && (
                        <a href={socialLinks.linkedin} target="_blank" rel="noopener noreferrer" style={{ color: '#475569', transition: 'color 0.18s' }} aria-label="LinkedIn">
                          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                          </svg>
                        </a>
                      )}
                      {socialLinks.instagram && (
                        <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" style={{ color: '#475569', transition: 'color 0.18s' }} aria-label="Instagram">
                          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                          </svg>
                        </a>
                      )}
                      {socialLinks.github && (
                        <a href={socialLinks.github} target="_blank" rel="noopener noreferrer" style={{ color: '#475569', transition: 'color 0.18s' }} aria-label="GitHub">
                          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                          </svg>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Bottom copyright banner */}
        <div style={{ borderTop: '1px solid #E6EBF2', paddingTop: '28px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', fontSize: '0.8rem', color: '#64748B' }}>
          <p>© {currentYear} KLEF ACM Student Chapter. All Rights Reserved.</p>
          <p>Advancing Computing as a Science & Profession</p>
        </div>
      </div>
    </footer>
  );
}
