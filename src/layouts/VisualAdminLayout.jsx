import React, { useContext, useState } from 'react';
import { useParams, useLocation, Navigate } from 'react-router-dom';
import { AuthContext, SiteDataContext } from '../App';
import { VisualEditorProvider } from '../context/VisualEditorContext';
import VisualAdminHeader from '../components/VisualEditor/VisualAdminHeader';
import { api } from '../services/api';

// Direct Public Pages
import Home from '../pages/Home';
import AboutAcm from '../pages/AboutAcm';
import AboutKlefAcm from '../pages/AboutKlefAcm';
import Events from '../pages/Events';
import Gallery from '../pages/Gallery';
import Members from '../pages/Members';
import Contact from '../pages/Contact';
import AdminInbox from '../pages/AdminInbox';

export default function VisualAdminLayout({ page: propPage, editMode: propEditMode }) {
  const { auth } = useContext(AuthContext);
  const { siteData, triggerDataRefresh } = useContext(SiteDataContext);
  const params = useParams();
  const location = useLocation();

  // Determine active section and edit mode from props or URL
  const pathParts = location.pathname.split('/').filter(Boolean);
  const isEditMode = propEditMode !== undefined 
    ? propEditMode 
    : location.pathname.endsWith('/Edit') || location.pathname.endsWith('/edit');

  const sectionParam = propPage || params.section || (pathParts[1] || 'Home');
  const section = sectionParam.replace(/\/Edit$/i, '').replace(/\/edit$/i, '');

  // If unauthenticated, redirect to login
  if (!auth.authenticated && !auth.loading) {
    return <Navigate to="/Admin/Log-in" replace />;
  }

  // Determine database slug from URL section
  let slug = 'home';
  const sLower = section.toLowerCase();
  if (sLower === 'about-acm') slug = 'about-acm';
  else if (sLower === 'about-klu-acm' || sLower === 'about-klef-acm') slug = 'about-klef-acm';
  else if (sLower === 'gallery') slug = 'gallery';
  else if (sLower === 'events') slug = 'events';
  else if (sLower === 'members') slug = 'members';
  else if (sLower === 'contact') slug = 'contact';
  else slug = 'home';

  const initialPageData = siteData?.pages?.[slug]?.content || {};

  // Save handler writing directly to database
  const handleSavePage = async (updatedDraft) => {
    // 1. Save page content to pages table
    const existingPage = siteData?.pages?.[slug] || {};
    const payload = {
      id: existingPage.id,
      slug: slug,
      title: existingPage.title || `${section} Page Content`,
      content: updatedDraft,
    };
    await api.updateRow('pages', payload);

    if (slug === 'contact') {
      await api.updateRow('contact_settings', {
        key: 'contact_info',
        value: updatedDraft,
      });
    }

    // Refresh context and broadcast live update
    await triggerDataRefresh(true);
  };

  const renderPageComponent = () => {
    const s = section.toLowerCase();
    switch (s) {
      case 'home':
        return <Home isVisualAdmin={true} isEditMode={isEditMode} />;
      case 'about-acm':
        return <AboutAcm isVisualAdmin={true} isEditMode={isEditMode} />;
      case 'about-klu-acm':
      case 'about-klef-acm':
        return <AboutKlefAcm isVisualAdmin={true} isEditMode={isEditMode} />;
      case 'events':
        return <Events isVisualAdmin={true} isEditMode={isEditMode} />;
      case 'gallery':
        return <Gallery isVisualAdmin={true} isEditMode={isEditMode} />;
      case 'members':
        return <Members isVisualAdmin={true} isEditMode={isEditMode} />;
      case 'inbox':
        return <AdminInbox />;
      case 'contact':
        return <Contact isVisualAdmin={true} isEditMode={isEditMode} />;
      default:
        return <Home isVisualAdmin={true} isEditMode={isEditMode} />;
    }
  };

  return (
    <VisualEditorProvider
      pageSlug={slug}
      isEditMode={isEditMode}
      initialData={initialPageData}
      onSavePage={handleSavePage}
    >
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff' }}>
        {/* Top Visual CMS Toolbar */}
        <VisualAdminHeader currentSection={section} isEditMode={isEditMode} />

        {/* Live Visual Website Page Representation */}
        <main style={{ flex: 1 }}>
          {renderPageComponent()}
        </main>
      </div>
    </VisualEditorProvider>
  );
}
