import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/Events', label: 'Events' },
    { path: '/Gallery', label: 'Gallery' },
    { path: '/Members', label: 'Members' },
    { path: '/About-ACM', label: 'About ACM' },
    { path: '/About-KLEF-ACM', label: 'About KLEF ACM' },
    { path: '/Contact', label: 'Contact' },
  ];

  return (
    <header className="header-wrapper">
      <div className="container header-container">
        {/* Logo Section */}
        <Link to="/" className="logo-container" aria-label="KLEF ACM Student Chapter — Home">
          <img src={`${import.meta.env.BASE_URL}brand/klef-acm-logo.png`} alt="KL University × KLEF ACM Student Chapter" className="brand-logo" />
        </Link>

        {/* Desktop Navigation */}
        <nav className="nav-menu">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              {item.label}
            </NavLink>
          ))}
          <Link to="/Join" className="btn btn-red nav-cta">Join the Chapter</Link>
        </nav>

        {/* Mobile Menu Toggle Button */}
        <button
          className="mobile-menu-btn"
          onClick={toggleMobileMenu}
          aria-label="Toggle menu"
          style={{ padding: '6px', background: 'transparent', border: 'none', cursor: 'pointer' }}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Navigation Dropdown */}
      <div
        style={{
          position: 'absolute',
          top: 'var(--header-height)',
          left: 0,
          right: 0,
          backgroundColor: 'var(--bg-white)',
          borderBottom: '1px solid var(--border-light)',
          zIndex: 99,
          display: 'flex',
          flexDirection: 'column',
          padding: mobileMenuOpen ? '20px 24px' : '0 24px',
          gap: '14px',
          maxHeight: mobileMenuOpen ? '500px' : '0px',
          opacity: mobileMenuOpen ? 1 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease, padding 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
          pointerEvents: mobileMenuOpen ? 'auto' : 'none'
        }}
      >
        {navItems.map((item, idx) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            style={{ 
              padding: '10px 0', 
              fontSize: '0.95rem',
              borderBottom: '1px solid var(--border-subtle)',
              transform: mobileMenuOpen ? 'translateY(0)' : 'translateY(-8px)',
              opacity: mobileMenuOpen ? 1 : 0,
              transition: `transform 0.35s cubic-bezier(0.16, 1, 0.3, 1) ${idx * 30}ms, opacity 0.35s ease ${idx * 30}ms`
            }}
            onClick={() => setMobileMenuOpen(false)}
          >
            {item.label}
          </NavLink>
        ))}
        <Link to="/Join" className="btn btn-red" style={{ justifyContent: 'center' }} onClick={() => setMobileMenuOpen(false)}>Join the Chapter</Link>
      </div>
    </header>
  );
}
