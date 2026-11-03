import { useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Postgraduate', 'Research Scholar', 'Faculty', 'Other'];
const INTERESTS = ['Web & App Development', 'AI / Machine Learning', 'Cloud Computing', 'Competitive Programming', 'Cybersecurity', 'Research & Publications', 'Event Management', 'Design & Media'];
const EMPTY = { name: '', email: '', studentId: '', phone: '', year: '', department: '', acmId: '', interests: [], reason: '', website: '' };

export default function Join() {
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [doneMsg, setDoneMsg] = useState('');

  const field = (key) => ({ value: form[key], onChange: (e) => setForm({ ...form, [key]: e.target.value }) });
  const toggleInterest = (i) => setForm({
    ...form,
    interests: form.interests.includes(i) ? form.interests.filter((x) => x !== i) : [...form.interests, i],
  });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.submitJoinApplication(form);
      setDoneMsg(res.message || 'Your application has been received.');
      setForm(EMPTY);
      window.scrollTo({ top: 0, behavior: 'instant' });
    } catch (err) {
      // What they typed stays in the form so they can retry
      setError(err.status ? err.message : 'Your application could not be sent. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const req = <span style={{ color: 'var(--primary)' }}>*</span>;

  return (
    <div style={{ minHeight: '80vh', paddingBottom: '88px' }}>
      <section className="page-hero bg-mesh">
        <div className="container">
          <span className="editorial-kicker">Membership</span>
          <h1 style={{ marginBottom: '12px' }}>Join the Chapter</h1>
          <p style={{ maxWidth: '680px', margin: 0, lineHeight: 1.65 }}>
            Tell us about yourself and what you want to work on. The chapter team reviews every application and will contact you by email.
          </p>
        </div>
      </section>

      <div className="container" style={{ marginTop: '48px', maxWidth: '820px' }}>
        <div className="panel" style={{ padding: 'clamp(20px, 4vw, 40px)' }}>
          {doneMsg ? (
            <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '14px' }}>
              <CheckCircle2 size={40} color="#4ADE80" />
              <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Thank you!</h2>
              <p style={{ margin: 0, color: 'var(--muted)' }}>{doneMsg}</p>
              <button type="button" className="btn btn-secondary" onClick={() => setDoneMsg('')}>Submit another application</button>
            </div>
          ) : (
            <form onSubmit={submit}>
              {error && (
                <div role="alert" style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '12px 16px', marginBottom: '20px', borderRadius: '8px', background: 'rgba(211, 42, 56, 0.14)', border: '1px solid rgba(255, 90, 98, 0.5)', color: '#FF8A90', fontSize: '0.92rem' }}>
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />{error}
                </div>
              )}
              {/* Honeypot: hidden from people, bots fill it in */}
              <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-9999px' }} {...field('website')} />

              <div className="join-grid">
                <div className="form-group"><label className="form-label" htmlFor="j-name">Full Name {req}</label><input id="j-name" required maxLength={100} autoComplete="name" className="form-control" {...field('name')} /></div>
                <div className="form-group"><label className="form-label" htmlFor="j-email">Email {req}</label><input id="j-email" type="email" required maxLength={200} autoComplete="email" className="form-control" {...field('email')} /></div>
                <div className="form-group"><label className="form-label" htmlFor="j-id">University ID {req}</label><input id="j-id" required maxLength={30} className="form-control" {...field('studentId')} /></div>
                <div className="form-group"><label className="form-label" htmlFor="j-phone">Phone {req}</label><input id="j-phone" type="tel" required maxLength={20} pattern="[+0-9][0-9 \-]{6,19}" title="Digits, spaces and an optional + sign" autoComplete="tel" className="form-control" {...field('phone')} /></div>
                <div className="form-group"><label className="form-label" htmlFor="j-year">Year of Study {req}</label>
                  <select id="j-year" required className="form-control" {...field('year')}>
                    <option value="" disabled>Choose one</option>
                    {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label" htmlFor="j-dept">Department {req}</label><input id="j-dept" required maxLength={100} placeholder="e.g. CSE" className="form-control" {...field('department')} /></div>
              </div>

              <div className="form-group"><label className="form-label" htmlFor="j-acm">ACM Member ID (if you have one)</label><input id="j-acm" maxLength={30} className="form-control" {...field('acmId')} /></div>

              <fieldset className="form-group" style={{ border: 'none', padding: 0 }}>
                <legend className="form-label">Areas of Interest</legend>
                <div className="join-chips">
                  {INTERESTS.map((i) => (
                    <label key={i} className={`join-chip${form.interests.includes(i) ? ' on' : ''}`}>
                      <input type="checkbox" checked={form.interests.includes(i)} onChange={() => toggleInterest(i)} />{i}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="form-group"><label className="form-label" htmlFor="j-why">Why do you want to join? {req}</label><textarea id="j-why" required rows={5} maxLength={2000} className="form-control" style={{ resize: 'vertical' }} {...field('reason')} /></div>

              <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                {loading ? 'Sending…' : 'Submit Application'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
