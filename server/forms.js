// Public forms (contact + join): validate, store in form_submissions, email the chapter.
// A submission succeeds if it was stored OR emailed, so one failing channel never loses it.
import nodemailer from 'nodemailer';

const EMAIL_RE = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']{2,}$/;
const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Postgraduate', 'Research Scholar', 'Faculty', 'Other'];

const clip = (v, max) => String(v ?? '').trim().slice(0, max);
export const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

// Returns { error } or { name, email, data, subject }
export function validateSubmission(kind, body = {}) {
  const name = clip(body.name, 100);
  const email = clip(body.email, 200);
  if (!name) return { error: 'Please enter your name.' };
  if (!EMAIL_RE.test(email)) return { error: 'Please enter a valid email address.' };

  if (kind === 'contact') {
    const subject = clip(body.subject, 150);
    const message = clip(body.message, 5000);
    if (!message) return { error: 'Please enter your message.' };
    return { name, email, subject: subject || 'General enquiry', data: { Subject: subject || 'General enquiry', Message: message } };
  }

  const studentId = clip(body.studentId, 30);
  const phone = clip(body.phone, 20);
  const year = clip(body.year, 30);
  const department = clip(body.department, 100);
  const reason = clip(body.reason, 2000);
  const interests = (Array.isArray(body.interests) ? body.interests : []).slice(0, 12).map((i) => clip(i, 60)).filter(Boolean);
  if (!studentId) return { error: 'Please enter your university ID.' };
  if (!/^[+\d][\d\s-]{6,19}$/.test(phone)) return { error: 'Please enter a valid phone number.' };
  if (!YEARS.includes(year)) return { error: 'Please choose your year of study.' };
  if (!department) return { error: 'Please enter your department.' };
  if (!reason) return { error: 'Please tell us why you want to join.' };
  return {
    name, email, subject: `Join application: ${name}`,
    data: {
      'University ID': studentId, Phone: phone, Year: year, Department: department,
      'ACM Member ID': clip(body.acmId, 30) || 'Not a member yet',
      Interests: interests.join(', ') || 'Not specified', 'Why join': reason,
    },
  };
}

// ponytail: in-memory limit, per server instance; move to the DB if spam gets past it.
const WINDOW_MS = 10 * 60 * 1000, MAX_PER_WINDOW = 5;
const hits = new Map();
export function rateLimited(key, now = Date.now()) {
  const recent = (hits.get(key) || []).filter((t) => now - t < WINDOW_MS);
  recent.push(now); hits.set(key, recent);
  return recent.length > MAX_PER_WINDOW;
}

// Vercel sets x-real-ip itself; req.ip there is the proxy, shared by all visitors.
export const clientIp = (req) => req.headers['x-real-ip'] || req.ip;

async function sendMail(options) {
  const user = process.env.SMTP_USER || process.env.ADMIN_EMAIL;
  const pass = (process.env.SMTP_PASS || '').replace(/\s+/g, '');
  if (!user || !pass) return false;
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  for (const [port, secure] of [[587, false], [465, true]]) { // 587 first: 465 is often blocked
    try {
      const t = nodemailer.createTransport({ host, port, secure, auth: { user, pass }, connectionTimeout: 9000 });
      await t.sendMail({ ...options, from: `"KLEF ACM Student Chapter" <${user}>` });
      return true;
    } catch (err) {
      console.warn(`[SMTP ${port}]`, err.message);
    }
  }
  return false;
}

const adminEmail = (kind, s) => {
  const rows = Object.entries(s.data).map(([k, v]) => ({ k, v }));
  return {
    to: process.env.ADMIN_EMAIL || process.env.SMTP_USER,
    replyTo: s.email,
    subject: `[KLEF ACM ${kind === 'join' ? 'Application' : 'Enquiry'}] ${s.subject}`,
    text: [`Name: ${s.name}`, `Email: ${s.email}`, ...rows.map((r) => `${r.k}: ${r.v}`)].join('\n'),
    html: `<div style="font-family:Arial,sans-serif;max-width:600px">
      <h2 style="color:#0077B6">${kind === 'join' ? 'New join application' : 'New contact enquiry'}</h2>
      <p><strong>Name:</strong> ${escapeHtml(s.name)}<br><strong>Email:</strong> ${escapeHtml(s.email)}</p>
      ${rows.map((r) => `<p><strong>${escapeHtml(r.k)}:</strong><br><span style="white-space:pre-wrap">${escapeHtml(r.v)}</span></p>`).join('')}
    </div>`,
  };
};

// The visitor's own text is deliberately not echoed: anyone can type any address here,
// and repeating their text would let this form send spam to strangers.
const confirmationEmail = (kind, s) => {
  const what = kind === 'join' ? 'application to join' : 'message to';
  return {
    to: s.email,
    subject: `We received your ${kind === 'join' ? 'application' : 'message'}: KLEF ACM Student Chapter`,
    text: `Dear ${s.name},\n\nThanks for your ${what} the KLEF ACM Student Chapter. Our team will get back to you soon.\n\nKLEF ACM Student Chapter\nKL Deemed to be University, Vaddeswaram`,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px"><p>Dear <strong>${escapeHtml(s.name)}</strong>,</p>
      <p>Thanks for your ${what} the KLEF ACM Student Chapter. Our team will get back to you soon.</p>
      <p style="color:#64748b;font-size:13px">KLEF ACM Student Chapter<br>KL Deemed to be University, Vaddeswaram</p></div>`,
  };
};

export function createFormHandler(kind, supabase) {
  return async (req, res) => {
    const body = req.body || {};
    if (body.website) return res.json({ success: true, message: 'Thank you.' }); // honeypot: bots fill hidden fields
    if (rateLimited(clientIp(req))) return res.status(429).json({ error: 'Too many submissions. Please try again in a few minutes.' });
    const s = validateSubmission(kind, body);
    if (s.error) return res.status(400).json({ error: s.error });

    let stored = false;
    if (supabase) {
      const { error } = await supabase.from('form_submissions').insert({ kind, name: s.name, email: s.email, data: s.data, status: 'new' });
      if (error) console.warn('[form_submissions]', error.message); else stored = true;
    }
    const mailed = await sendMail(adminEmail(kind, s));
    if (!stored && !mailed) {
      return res.status(502).json({ error: 'Your submission could not be sent. Please try again in a little while.' });
    }
    const confirmed = await sendMail(confirmationEmail(kind, s)); // awaited: serverless freezes after the response
    return res.json({
      success: true,
      message: (kind === 'join' ? 'Your application has been received.' : 'Your message has been received.')
        + (confirmed ? ' A confirmation has been sent to your email.' : ''),
    });
  };
}
