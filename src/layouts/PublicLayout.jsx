import { useContext, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Loader from '../components/Loader';
import ErrorBoundary from '../components/ErrorBoundary';
import { SiteDataContext } from '../App';

export default function PublicLayout() {
  const { siteData } = useContext(SiteDataContext);
  const location = useLocation();
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const path = location.pathname;
    let title = 'KLEF ACM Student Chapter';
    let description = 'KLEF ACM Student Chapter at Koneru Lakshmaiah Education Foundation (Deemed to be University).';

    if (path.endsWith('/events') || path.includes('/events') || path.includes('/Events')) {
      title = 'KLEF ACM — Events';
      description = 'Explore upcoming coding events, workshops, hackathons, and technical bootcamps organized by KLEF ACM.';
    } else if (path.endsWith('/gallery') || path.includes('/gallery') || path.includes('/Gallery')) {
      title = 'KLEF ACM — Gallery';
      description = 'Visual documentation and gallery archives of past KLEF ACM hackathons, sessions, and workshops.';
    } else if (path.endsWith('/members') || path.includes('/members') || path.includes('/Members')) {
      title = 'KLEF ACM — Members';
      description = 'Meet the faculty coordinators and student committee members driving KLEF ACM chapter leadership.';
    } else if (path.endsWith('/about-acm') || path.includes('/About-ACM')) {
      title = 'KLEF ACM — About ACM';
      description = 'Learn about the Association for Computing Machinery (ACM), the world\'s largest scientific computing society.';
    } else if (path.endsWith('/about-klef-acm') || path.includes('/About-KLEF-ACM') || path.includes('/About-KLU-ACM')) {
      title = 'KLEF ACM — About KLEF ACM';
      description = 'About the KLEF ACM Student Chapter at Koneru Lakshmaiah Education Foundation (Deemed to be University).';
    } else if (path.endsWith('/contact') || path.includes('/Contact')) {
      title = 'KLEF ACM — Contact';
      description = 'Get in touch with the KLEF ACM Student Chapter representatives and coordinators.';
    }

    document.title = title;

    // Update or create meta description tag
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.name = 'description';
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', description);

    // Scroll to top on navigation
    // 'instant' overrides the global smooth scrolling, which got interrupted when the page content swapped
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    setScrollProgress(0);
  }, [location]);

  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (totalScroll > 0) {
        setScrollProgress((window.scrollY / totalScroll) * 100);
      } else {
        setScrollProgress(0);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);

    // Check if on specific member bio/profile detail route
    const isMemberBioPage = /^\/members\/.+/i.test(location.pathname);
    return (
      <div className="theme-dark" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Loading screen: once per full page load */}
        <Loader />

        {/* Viewport Top Scroll Progress Indicator */}
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            width: `${scrollProgress}%`, 
            height: '2.5px', 
            backgroundColor: 'var(--primary)', 
            zIndex: 10000, 
            transition: 'width 0.1s cubic-bezier(0.22, 1, 0.36, 1)' 
          }} 
        />
        <Header />
        <main style={{ flex: '1 0 auto' }}>
          <div className="page-transition-wrapper">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
        {!isMemberBioPage && <Footer contact={siteData?.contact || {}} />}
      </div>
    );
  }
