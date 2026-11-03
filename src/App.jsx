import React, { createContext, useState, useEffect } from 'react';
import { MotionConfig } from 'framer-motion';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Services
import { api } from './services/api';
import { subscribeToRealtimeUpdates } from './services/realtime';

// Layouts & Components
import PublicLayout from './layouts/PublicLayout';
import VisualAdminLayout from './layouts/VisualAdminLayout';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Home from './pages/Home';
import Events from './pages/Events';
import Gallery from './pages/Gallery';
import Members from './pages/Members';
import AboutAcm from './pages/AboutAcm';
import AboutKlefAcm from './pages/AboutKlefAcm';
import Contact from './pages/Contact';
import Join from './pages/Join';
import AdminLogin from './pages/AdminLogin';

// Context Definitions
export const AuthContext = createContext(null);
export const SiteDataContext = createContext(null);

export default function App() {
  const [auth, setAuth] = useState({
    authenticated: false,
    user: null,
    loading: true,
  });

  // Instant hydration from local client cache
  const initialCache = api.getCachedPublicData();
  const [siteData, setSiteData] = useState(initialCache || {
    events: [],
    members: [],
    pages: {},
    gallery: [],
    contact: {},
  });
  const [siteDataLoading, setSiteDataLoading] = useState(!initialCache);

  // Verifies the administrator session on mount
  const checkAuth = async () => {
    try {
      const data = await api.checkSession();
      if (data && data.authenticated) {
        setAuth({
          authenticated: true,
          user: data.user,
          loading: false,
        });
      } else {
        setAuth({
          authenticated: false,
          user: null,
          loading: false,
        });
      }
    } catch (err) {
      console.error('Session validation exception:', err);
      setAuth({
        authenticated: false,
        user: null,
        loading: false,
      });
    }
  };

  // Fetches all public content at once with Stale-While-Revalidate speed
  const triggerDataRefresh = async (isBackground = false) => {
    try {
      // Only show blocking loader if we have zero cached data to render
      if (!isBackground && !siteData?.members?.length && !siteData?.events?.length && !initialCache) {
        setSiteDataLoading(true);
      }
      const data = await api.getPublicData('all');
      if (data) {
        setSiteData({
          events: data.events || [],
          members: data.members || [],
          pages: data.pages || {},
          gallery: data.gallery || [],
          contact: data.contact || {},
        });
      }
    } catch (err) {
      console.error('Failed to load public site data:', err);
    } finally {
      setSiteDataLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
    triggerDataRefresh(Boolean(initialCache));

    // Subscribe to live database updates across all tables
    const unsubscribe = subscribeToRealtimeUpdates((update) => {
      console.log(`[Realtime Sync] Live update detected: ${update.table} (${update.event} from ${update.source || 'db'})`);
      triggerDataRefresh(true);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ auth, setAuth, checkAuth }}>
      <SiteDataContext.Provider value={{ siteData, setSiteData, siteDataLoading, triggerDataRefresh }}>
        {/* Play animations even when the OS asks for reduced motion (site owner's choice) */}
        <MotionConfig reducedMotion="never">
        <BrowserRouter>
          <Routes>
            {/* PUBLIC WEBSITE ROUTES - CAPITALIZED WITH DEEP LINKS */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/Home" element={<Home />} />
              
              <Route path="/Events" element={<Events />} />
              <Route path="/Events/:eventName" element={<Events />} />
              <Route path="/Events/:eventName/:date" element={<Events />} />
              <Route path="/events" element={<Navigate to="/Events" replace />} />
              <Route path="/events/:eventName" element={<Events />} />
              <Route path="/events/:eventName/:date" element={<Events />} />
              
              <Route path="/Gallery" element={<Gallery />} />
              <Route path="/Gallery/:eventTitle" element={<Gallery />} />
              <Route path="/gallery" element={<Navigate to="/Gallery" replace />} />
              <Route path="/gallery/:eventTitle" element={<Gallery />} />
              
              <Route path="/Members" element={<Members />} />
              <Route path="/Members/:name" element={<Members />} />
              <Route path="/Members/:name/:role" element={<Members />} />
              <Route path="/members" element={<Navigate to="/Members" replace />} />
              <Route path="/members/:name" element={<Members />} />
              <Route path="/members/:name/:role" element={<Members />} />
              
              <Route path="/About-ACM" element={<AboutAcm />} />
              <Route path="/about-acm" element={<Navigate to="/About-ACM" replace />} />
              
              <Route path="/About-KLEF-ACM" element={<AboutKlefAcm />} />
              <Route path="/About-KLU-ACM" element={<Navigate to="/About-KLEF-ACM" replace />} />
              <Route path="/about-klef-acm" element={<Navigate to="/About-KLEF-ACM" replace />} />
              <Route path="/about-klu-acm" element={<Navigate to="/About-KLEF-ACM" replace />} />
              
              <Route path="/Contact" element={<Contact />} />
              <Route path="/Join" element={<Join />} />
              <Route path="/join" element={<Navigate to="/Join" replace />} />
              <Route path="/contact" element={<Navigate to="/Contact" replace />} />
            </Route>

            {/* ADMIN LOGIN ROUTES */}
            <Route path="/Admin/Log-in" element={<AdminLogin />} />
            <Route path="/Admin/Login" element={<Navigate to="/Admin/Log-in" replace />} />
            <Route path="/admin/login" element={<Navigate to="/Admin/Log-in" replace />} />

            {/* PROTECTED VISUAL WYSIWYG ADMIN CMS ROUTES */}
            <Route
              path="/Admin"
              element={
                <ProtectedRoute>
                  <VisualAdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/Admin/Home" replace />} />
              <Route path=":section" element={null} />
              <Route path=":section/Edit" element={null} />
              <Route path=":section/edit" element={null} />
            </Route>

            {/* GLOBAL 404 CATCH-ALL */}
            <Route path="*" element={<Navigate to="/Home" replace />} />
          </Routes>
        </BrowserRouter>
        </MotionConfig>
      </SiteDataContext.Provider>
    </AuthContext.Provider>
  );
}
