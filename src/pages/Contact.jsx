import { useContext, useState } from 'react';
import { Mail, Phone, MapPin, Send, MessageSquare, User, Clock, HelpCircle, CheckCircle2, AlertCircle } from 'lucide-react';
import { SiteDataContext } from '../App';
import { api } from '../services/api';
import { ScrollReveal, SplitText } from '../components/ScrollReveal';
import VisualEditable from '../components/VisualEditor/VisualEditable';
import PageBlockList from '../components/VisualEditor/PageBlockList';

export default function Contact({ isVisualAdmin = false, isEditMode = false }) {
  const { siteData } = useContext(SiteDataContext);
  const contact = siteData?.contact || {};

  // Read exact contact properties
  const email = contact.email || '';
  const phone = contact.phone || '';
  const mapUrl = contact.map_url || '';

  // Address defaults to the official university campus address
  const address = contact.address || `Department of Computer Science & Engineering
Koneru Lakshmaiah Education Foundation (Deemed to be University)
Green Fields, Vaddeswaram, Guntur District
Andhra Pradesh, India – 522302`;

  // Form State
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      alert('Please fill out all required fields.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    setStatusMsg('');

    try {
      const res = await api.sendContactInquiry(formData);
      setLoading(false);
      setSubmitted(true);
      setStatusMsg(res.message || 'Inquiry sent successfully! A confirmation copy has been sent to your email.');
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      // Keep what they typed so they can retry; never claim a failed send succeeded
      console.warn('Contact API error:', err.message);
      setLoading(false);
      const fallback = email ? ` You can also email us at ${email}.` : '';
      setErrorMsg(`${err.status ? err.message : 'Your message could not be sent. Please check your connection and try again.'}${fallback}`);
    }
  };


  return (
    <div style={{ backgroundColor: 'transparent', minHeight: '80vh', paddingBottom: '88px' }}>
      {/* Page Header */}
      <section className="page-hero bg-mesh">
        <div className="orb orb-red" />
        <div className="orb orb-blue" />
        <div className="container">
          <VisualEditable
            name="contact_tag"
            as="span"
            defaultValue="CHAPTER CONNECTION"
            className="editorial-kicker"
          />
          <VisualEditable
            name="contact_title"
            as="h1"
            defaultValue="CONTACT KLEF ACM"
            style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: '800', color: 'var(--navy-900)', letterSpacing: '0', marginBottom: '12px', lineHeight: '1.2' }}
          />
          <VisualEditable
            name="contact_subtitle"
            as="p"
            defaultValue="Have questions about chapter memberships, coding activities, hackathons, or computing workshops? Get in touch with our committee."
            style={{ color: 'var(--slate-600)', fontSize: '1.05rem', lineHeight: '1.65', maxWidth: '680px', margin: 0 }}
          />
        </div>
      </section>

      {/* Main Grid */}
      <section className="section" style={{ padding: '64px 0' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '56px' }} className="contact-grid">
          
          {/* Column 1: Info & Campus Desk */}
          <ScrollReveal delay={0} duration={600}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              <div style={{ border: '1px solid var(--border-light)', padding: '32px', borderRadius: '4px', backgroundColor: 'var(--card)', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--navy-900)', margin: 0, paddingBottom: '12px', borderBottom: '1px solid var(--border-light)' }}>
                  Chapter Directory
                </h2>
                
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  <MapPin size={18} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '3px' }} />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: '700', fontSize: '0.75rem', color: 'var(--slate-500)', textTransform: 'uppercase', display: 'block', marginBottom: '4px', letterSpacing: '0.08em' }}>Campus Location</span>
                    <VisualEditable
                      name="address"
                      as="p"
                      defaultValue={address}
                      style={{ fontSize: '0.92rem', color: 'var(--navy-900)', lineHeight: '1.65', margin: 0, whiteSpace: 'pre-line' }}
                    />
                  </div>
                </div>

                {(email || isVisualAdmin) && (
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    <Mail size={18} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '3px' }} />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: '700', fontSize: '0.75rem', color: 'var(--slate-500)', textTransform: 'uppercase', display: 'block', marginBottom: '4px', letterSpacing: '0.08em' }}>Official Email</span>
                      <VisualEditable
                        name="email"
                        as="div"
                        defaultValue={email || 'acm.studentchapter@kluniversity.in'}
                        style={{ fontSize: '0.92rem', color: 'var(--primary)', fontWeight: '600' }}
                      />
                    </div>
                  </div>
                )}

                {(phone || isVisualAdmin) && (
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    <Phone size={18} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '3px' }} />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: '700', fontSize: '0.75rem', color: 'var(--slate-500)', textTransform: 'uppercase', display: 'block', marginBottom: '4px', letterSpacing: '0.08em' }}>Phone / Helpdesk</span>
                      <VisualEditable
                        name="phone"
                        as="div"
                        defaultValue={phone || '+91 86323 99999'}
                        style={{ fontSize: '0.92rem', color: 'var(--navy-900)', fontWeight: '500' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Map Directions & Iframe */}
              <div style={{ border: '1px solid var(--border-light)', borderRadius: '4px', overflow: 'hidden', backgroundColor: 'var(--card)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '700', fontSize: '0.78rem', color: 'var(--navy-900)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    KL University Campus Map
                  </span>
                  <a 
                    href="https://maps.app.goo.gl/uLVUEpEqWxLT5MFS7" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem', padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <span>Get Driving Directions</span>
                    <MapPin size={12} />
                  </a>
                </div>
                <div style={{ borderRadius: '2px', overflow: 'hidden', height: '240px', border: '1px solid var(--border-light)' }}>
                  <iframe
                    title="KL Deemed to be University Campus Location Map"
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3826.664448574163!2d80.62024107577579!3d16.441852029302636!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a35f0a2a0000001%3A0x6d7088b209d84bfd!2sK%20L%20University!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen=""
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Column 2: Message Form */}
          <ScrollReveal delay={150} duration={650}>
            <div style={{ border: '1px solid var(--border-light)', padding: '36px', borderRadius: '4px', backgroundColor: 'var(--card)' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--navy-900)', margin: 0, paddingBottom: '14px', borderBottom: '1px solid var(--border-light)', marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={18} style={{ color: 'var(--primary)' }} />
                Send An Enquiry
              </h2>

              {submitted ? (
                <div style={{ padding: '36px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '16px', border: '1px solid var(--border-light)', borderRadius: '4px', backgroundColor: 'var(--slate-50)' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '4px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle2 size={26} />
                  </div>
                  <div>
                    <h3 style={{ color: 'var(--navy-900)', marginBottom: '8px', marginTop: 0, fontSize: '1.15rem', fontWeight: '800' }}>Enquiry Received!</h3>
                    <p style={{ fontSize: '0.92rem', color: 'var(--slate-600)', margin: 0, lineHeight: '1.6', maxWidth: '420px' }}>
                      {statusMsg}
                    </p>
                  </div>
                  <button onClick={() => setSubmitted(false)} className="btn btn-secondary btn-sm" style={{ marginTop: '8px' }}>
                    Send Another Enquiry
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  {/* Honeypot: hidden from people, bots fill it in */}
                  <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-9999px' }}
                    value={formData.website || ''} onChange={(e) => setFormData({ ...formData, website: e.target.value })} />
                  {errorMsg && (
                    <div style={{ padding: '12px 16px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '4px', color: '#991B1B', fontSize: '0.88rem', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertCircle size={16} />
                      {errorMsg}
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">Your Name <span style={{ color: 'var(--primary)' }}>*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      className="form-control"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Your Email Address <span style={{ color: 'var(--primary)' }}>*</span></label>
                    <input
                      type="email"
                      required
                      placeholder="name@kluniversity.in"
                      className="form-control"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Topic / Subject</label>
                    <input
                      type="text"
                      placeholder="e.g. Chapter Membership / Hackathon Query"
                      className="form-control"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Message Details <span style={{ color: 'var(--primary)' }}>*</span></label>
                    <textarea
                      rows="5"
                      required
                      placeholder="Write your question, feedback, or collaboration inquiry..."
                      className="form-control"
                      style={{ resize: 'vertical' }}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center', marginTop: '12px', borderRadius: '4px' }}
                  >
                    {loading ? 'Transmitting Enquiry...' : 'Submit Inquiry'}
                  </button>
                </form>
              )}
            </div>
          </ScrollReveal>

        </div>
      </section>

      {/* Free-Form Dynamic Content Blocks */}
      <section style={{ padding: '0 0 48px 0' }}>
        <div className="container" style={{ maxWidth: '880px' }}>
          <PageBlockList blockKey="contact_blocks" />
        </div>
      </section>


      {/* Local responsive style */}
      <style>{`
        @media (max-width: 900px) {
          .contact-grid {
            grid-template-columns: 1fr !important;
            gap: 48px !important;
          }
        }
      `}</style>
    </div>
  );
}
