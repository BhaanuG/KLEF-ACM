import React, { useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Bold, 
  Italic, 
  Underline, 
  Link as LinkIcon, 
  Heading2, 
  Heading3, 
  List, 
  Undo, 
  Redo, 
  Save, 
  Eye, 
  EyeOff, 
  ArrowLeft, 
  Edit3, 
  LogOut, 
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useVisualEditor } from '../../context/VisualEditorContext';
import { AuthContext, SiteDataContext } from '../../App';
import { api } from '../../services/api';

export default function VisualAdminHeader({ currentSection, isEditMode }) {
  const { 
    isPreview, 
    setIsPreview, 
    hasUnsavedChanges, 
    isSaving, 
    saveStatus, 
    handleSave, 
    executeCommand 
  } = useVisualEditor();
  
  const { setAuth } = useContext(AuthContext);
  const { triggerDataRefresh } = useContext(SiteDataContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    if (hasUnsavedChanges && !window.confirm('You have unsaved changes. Are you sure you want to log out?')) {
      return;
    }
    try {
      await api.logout();
      setAuth({ authenticated: false, user: null, loading: false });
      navigate('/Admin/Log-in');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const pages = [
    { slug: 'Home', label: 'Home', path: '/Admin/Home', editPath: '/Admin/Home/Edit' },
    { slug: 'About-ACM', label: 'About ACM', path: '/Admin/About-ACM', editPath: '/Admin/About-ACM/Edit' },
    { slug: 'About-KLEF-ACM', label: 'About KLEF ACM', path: '/Admin/About-KLEF-ACM', editPath: '/Admin/About-KLEF-ACM/Edit' },
    { slug: 'Events', label: 'Events', path: '/Admin/Events', editPath: '/Admin/Events/Edit' },
    { slug: 'Gallery', label: 'Gallery', path: '/Admin/Gallery', editPath: '/Admin/Gallery/Edit' },
    { slug: 'Members', label: 'Members', path: '/Admin/Members', editPath: '/Admin/Members/Edit' },
    { slug: 'Contact', label: 'Contact', path: '/Admin/Contact', editPath: '/Admin/Contact/Edit' },
  ];

  const activePageObj = pages.find(p => p.slug.toLowerCase() === currentSection.toLowerCase()) || pages[0];

  const handleCreateLink = () => {
    const url = window.prompt('Enter link destination URL (https://...):');
    if (url) {
      executeCommand('createLink', url);
    }
  };

  const handleExitEdit = () => {
    if (hasUnsavedChanges && !window.confirm('You have unsaved changes. Discard and exit edit mode?')) {
      return;
    }
    navigate(activePageObj.path);
  };

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 90000,
        backgroundColor: '#0f172a',
        color: '#ffffff',
        borderBottom: '1px solid #1e293b',
        boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
        userSelect: 'none',
      }}
    >
      {/* Top Main Admin Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 24px',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        {/* Brand & Mode */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              backgroundColor: '#005CA9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
            }}
          >
            <ShieldCheck size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.92rem', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.01em' }}>
              KLEF ACM Visual CMS
            </div>
            <div style={{ fontSize: '0.7rem', color: '#38BDF8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {isEditMode ? `WYSIWYG Editor // ${activePageObj.label}` : 'Visual Website Manager'}
            </div>
          </div>
        </div>

        {/* Page Selector Tabs */}
        {!isEditMode && (
          <nav style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {pages.map((p) => {
              const isActive = p.slug.toLowerCase() === currentSection.toLowerCase();
              return (
                <Link
                  key={p.slug}
                  to={p.path}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    fontWeight: isActive ? '700' : '500',
                    color: isActive ? '#ffffff' : '#94a3b8',
                    backgroundColor: isActive ? '#005CA9' : 'transparent',
                    textDecoration: 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {p.label}
                </Link>
              );
            })}
          </nav>
        )}

        {/* Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {!isEditMode ? (
            <>
              <Link
                to={activePageObj.editPath}
                className="btn btn-primary"
                style={{
                  padding: '8px 18px',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: '800',
                  backgroundColor: '#005CA9',
                  borderColor: '#005CA9',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Edit3 size={15} />
                <span>Edit Page</span>
              </Link>

              <Link
                to={`/${activePageObj.slug === 'Home' ? '' : activePageObj.slug}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  padding: '8px 14px',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  fontWeight: '600',
                  color: '#94a3b8',
                  border: '1px solid #334155',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>Live View</span>
                <ExternalLink size={13} />
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  color: '#f87171',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <LogOut size={14} />
              </button>
            </>
          ) : (
            <>
              {/* Change Indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', marginRight: '6px' }}>
                {hasUnsavedChanges ? (
                  <span style={{ color: '#FBBF24', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '700' }}>
                    <AlertCircle size={14} />
                    <span>Unsaved Changes</span>
                  </span>
                ) : (
                  <span style={{ color: '#34D399', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                    <CheckCircle2 size={14} />
                    <span>All changes saved</span>
                  </span>
                )}
              </div>

              {/* Preview Toggle */}
              <button
                type="button"
                onClick={() => setIsPreview(!isPreview)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  color: isPreview ? '#005CA9' : '#ffffff',
                  backgroundColor: isPreview ? '#ffffff' : '#1e293b',
                  border: '1px solid #334155',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {isPreview ? <EyeOff size={14} /> : <Eye size={14} />}
                <span>{isPreview ? 'Resume Editing' : 'Preview'}</span>
              </button>

              {/* Save Button */}
              <button
                type="button"
                disabled={isSaving}
                onClick={async () => {
                  await handleSave();
                  await triggerDataRefresh(true);
                  // Redirect to page review (exit /Edit mode)
                  setTimeout(() => {
                    navigate(activePageObj.path);
                  }, 500);
                }}
                className="btn btn-primary"
                style={{
                  padding: '8px 20px',
                  borderRadius: '6px',
                  fontSize: '0.86rem',
                  fontWeight: '800',
                  backgroundColor: saveStatus === 'saved' ? '#10B981' : '#005CA9',
                  borderColor: saveStatus === 'saved' ? '#10B981' : '#005CA9',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: isSaving ? 'wait' : 'pointer',
                  transition: 'background-color 0.2s',
                }}
              >
                {isSaving ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : saveStatus === 'saved' ? (
                  <>
                    <CheckCircle2 size={15} />
                    <span>Saved to Database</span>
                  </>
                ) : (
                  <>
                    <Save size={15} />
                    <span>Save Changes</span>
                  </>
                )}
              </button>

              {/* Back / Exit */}
              <button
                type="button"
                onClick={handleExitEdit}
                style={{
                  padding: '7px 12px',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  color: '#94a3b8',
                  backgroundColor: 'transparent',
                  border: '1px solid #334155',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <ArrowLeft size={14} />
                <span>Exit</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* WYSIWYG Contextual Text Formatting Toolbar (Visible in Edit Mode) */}
      {isEditMode && !isPreview && (
        <div
          style={{
            backgroundColor: '#1e293b',
            borderTop: '1px solid #334155',
            padding: '6px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            overflowX: 'auto',
          }}
        >
          <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', marginRight: '8px' }}>
            Text Tools:
          </span>

          <button
            type="button"
            title="Bold (Ctrl+B)"
            onClick={() => executeCommand('bold')}
            style={toolBtnStyle}
          >
            <Bold size={14} />
          </button>

          <button
            type="button"
            title="Italic (Ctrl+I)"
            onClick={() => executeCommand('italic')}
            style={toolBtnStyle}
          >
            <Italic size={14} />
          </button>

          <button
            type="button"
            title="Underline (Ctrl+U)"
            onClick={() => executeCommand('underline')}
            style={toolBtnStyle}
          >
            <Underline size={14} />
          </button>

          <div style={{ width: '1px', height: '18px', backgroundColor: '#475569', margin: '0 4px' }} />

          <button
            type="button"
            title="Heading 2"
            onClick={() => executeCommand('formatBlock', '<h2>')}
            style={{ ...toolBtnStyle, fontSize: '0.78rem', fontWeight: '700' }}
          >
            H2
          </button>

          <button
            type="button"
            title="Heading 3"
            onClick={() => executeCommand('formatBlock', '<h3>')}
            style={{ ...toolBtnStyle, fontSize: '0.78rem', fontWeight: '700' }}
          >
            H3
          </button>

          <button
            type="button"
            title="Paragraph"
            onClick={() => executeCommand('formatBlock', '<p>')}
            style={{ ...toolBtnStyle, fontSize: '0.78rem', fontWeight: '700' }}
          >
            P
          </button>

          <button
            type="button"
            title="Bullet List"
            onClick={() => executeCommand('insertUnorderedList')}
            style={toolBtnStyle}
          >
            <List size={14} />
          </button>

          <button
            type="button"
            title="Insert Link"
            onClick={handleCreateLink}
            style={toolBtnStyle}
          >
            <LinkIcon size={14} />
          </button>

          <div style={{ width: '1px', height: '18px', backgroundColor: '#475569', margin: '0 4px' }} />

          <button
            type="button"
            title="Undo"
            onClick={() => executeCommand('undo')}
            style={toolBtnStyle}
          >
            <Undo size={14} />
          </button>

          <button
            type="button"
            title="Redo"
            onClick={() => executeCommand('redo')}
            style={toolBtnStyle}
          >
            <Redo size={14} />
          </button>

          <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#64748b' }}>
            Click text anywhere on the page to edit directly
          </span>
        </div>
      )}
    </header>
  );
}

const toolBtnStyle = {
  backgroundColor: '#334155',
  color: '#f8fafc',
  border: 'none',
  borderRadius: '4px',
  padding: '5px 8px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  fontSize: '0.8rem',
  transition: 'background-color 0.15s ease',
};
