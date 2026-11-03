import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { createFormHandler, clientIp } from './forms.js';
import { offloadPayload, offloadRows, loadInlineMedia, fetchMembersLight, restoreMediaRefs, MEDIA_CACHE_HEADER } from './inlineMedia.js';

dotenv.config();

/**
 * Standard cookie serialization and parsing helpers (Zero-dependency)
 */
export function parseCookies(header) {
  const list = {};
  if (!header) return list;
  header.split(';').forEach(cookieItem => {
    let [name, ...rest] = cookieItem.split('=');
    name = name?.trim();
    if (!name) return;
    const value = rest.join('=').trim();
    if (!value) return;
    try {
      list[name] = decodeURIComponent(value);
    } catch {
      list[name] = value;
    }
  });
  return list;
}

export function serializeCookie(name, val, options = {}) {
  let str = `${name}=${encodeURIComponent(val)}`;
  if (options.maxAge != null) {
    str += `; Max-Age=${Math.floor(options.maxAge)}`;
  }
  if (options.domain) {
    str += `; Domain=${options.domain}`;
  }
  if (options.path) {
    str += `; Path=${options.path}`;
  }
  if (options.expires) {
    str += `; Expires=${options.expires.toUTCString()}`;
  }
  if (options.httpOnly) {
    str += '; HttpOnly';
  }
  if (options.secure) {
    str += '; Secure';
  }
  if (options.sameSite) {
    const sameSite = typeof options.sameSite === 'string' ? options.sameSite.toLowerCase() : options.sameSite;
    if (sameSite === true || sameSite === 'strict') {
      str += '; SameSite=Strict';
    } else if (sameSite === 'lax') {
      str += '; SameSite=Lax';
    } else if (sameSite === 'none') {
      str += '; SameSite=None';
    }
  }
  return str;
}

// Initialize Privileged Server-Side Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
// No shared default: a secret written in public code would let anyone forge an admin session.
// ponytail: random per-instance fallback keeps login safe but drops sessions on restart; set SESSION_SECRET.
const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

export const supabase = (supabaseUrl && supabaseServiceKey) 
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
  : null;

export function verifyAdminSession(req) {
  const cookieHeader = req.headers.cookie || req.headers.Cookie || '';
  if (!cookieHeader) return null;
  const cookies = parseCookies(cookieHeader);
  const token = cookies.acm_session;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, sessionSecret);
    return decoded;
  } catch (err) {
    return null;
  }
}

// In-Memory Fast Cache for Public Data (<1ms response time)
let publicDataCache = {
  data: null,
  timestamp: 0,
  ttl: 30000 // 30 seconds
};

let publicDataInFlight = null;

export function invalidatePublicCache() {
  publicDataCache.timestamp = 0;
}

const PUBLIC_CORS_PATHS = /^\/(public-data|me|media\/)/;
const isCorsOriginAllowed = (origin) => origin === 'https://klef.acm.org'
  || (process.env.NODE_ENV !== 'production' && /^http:\/\/localhost(:\d+)?$/.test(origin || ''));

// ponytail: in-memory login limiter — per server instance (resets on cold start); move to the
// DB if serverless instances ever need to share it.
const LOGIN_MAX_FAILS = 5;
const LOGIN_LOCK_MS = 10 * 60 * 1000;
const loginFails = new Map(); // key -> { count, until }
function loginLockRemaining(keys) {
  const now = Date.now();
  return Math.max(0, ...keys.map(k => { const e = loginFails.get(k); return e && e.until > now ? e.until - now : 0; }));
}
function recordLoginFailure(keys) {
  const now = Date.now();
  for (const k of keys) {
    const e = loginFails.get(k);
    const count = (e && (e.until === 0 || e.until > now) ? e.count : 0) + 1;
    loginFails.set(k, { count, until: count >= LOGIN_MAX_FAILS ? now + LOGIN_LOCK_MS : 0 });
  }
}
function clearLoginFailures(keys) { for (const k of keys) loginFails.delete(k); }

export function createApiRouter() {
  const router = express.Router();

  // CORS for the static site: its public GET endpoints and the public forms, no credentials.
  router.use((req, res, next) => {
    const isPublicGet = (req.method === 'GET' || req.method === 'HEAD') && PUBLIC_CORS_PATHS.test(req.path);
    const isContact = (req.path === '/contact' || req.path === '/apply') && (req.method === 'POST' || req.method === 'OPTIONS');
    if (isPublicGet || isContact) {
      res.vary('Origin');
      if (isCorsOriginAllowed(req.headers.origin)) {
        res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Methods', 'POST');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
          res.setHeader('Access-Control-Max-Age', '86400');
          return res.status(204).end();
        }
      }
    }
    next();
  });
  router.use(express.json({ limit: '50mb' }));
  router.use(express.urlencoded({ limit: '50mb', extended: true }));

  // ---------------------------------------------------------------------------
  // 1. PUBLIC DATA ENDPOINT (High-Speed Cached Reads with In-Flight Deduplication)
  // ---------------------------------------------------------------------------
  router.get('/public-data', async (req, res) => {
    const type = req.query.type || 'all';

    if (!supabase) {
      if (publicDataCache.data) return res.json(publicDataCache.data);
      return res.status(503).json({ error: 'Database service is currently unconfigured or connecting.' });
    }

    try {
      if (type === 'all') {
        const now = Date.now();
        // Return instantly from memory cache if fresh (< 30s)
        if (publicDataCache.data && (now - publicDataCache.timestamp < publicDataCache.ttl)) {
          res.setHeader('X-Cache', 'HIT');
          return res.json(publicDataCache.data);
        }

        // Deduplicate simultaneous in-flight requests
        if (!publicDataInFlight) {
          publicDataInFlight = (async () => {
            try {
              const fetchSafe = async (tablePromise, fallback = []) => {
                try {
                  const res = await tablePromise;
                  if (res.error) {
                    console.warn(`[Public-Data Query Warning]:`, res.error.message);
                    return fallback;
                  }
                  return res.data || fallback;
                } catch (e) {
                  console.warn(`[Public-Data Query Exception]:`, e.message);
                  return fallback;
                }
              };

              const [eventsData, membersData, pagesData, galleryData, contactData] = await Promise.all([
                fetchSafe(
                  supabase
                    .from('events')
                    .select('*')
                    .eq('is_published', true)
                    .order('date', { ascending: false }),
                  publicDataCache.data?.events || []
                ),
                fetchSafe(fetchMembersLight(supabase), publicDataCache.data?.members || []),
                fetchSafe(
                  supabase
                    .from('pages')
                    .select('slug, title, content'),
                  []
                ),
                fetchSafe(
                  supabase
                    .from('gallery_images')
                    .select('*')
                    .order('created_at', { ascending: false }),
                  publicDataCache.data?.gallery || []
                ),
                fetchSafe(
                  supabase
                    .from('contact_settings')
                    .select('key, value')
                    .eq('key', 'contact_info')
                    .maybeSingle(),
                  null
                ),
              ]);

              const pages = {};
              (pagesData || []).forEach(p => {
                pages[p.slug] = { title: p.title, content: p.content };
              });

              // Fallback to previous page content if current query returned empty
              if (Object.keys(pages).length === 0 && publicDataCache.data?.pages) {
                Object.assign(pages, publicDataCache.data.pages);
              }

              const payload = {
                events: eventsData && eventsData.length > 0 ? eventsData : (publicDataCache.data?.events || []),
                members: membersData && membersData.length > 0 ? membersData : (publicDataCache.data?.members || []),
                pages: Object.keys(pages).length > 0 ? pages : (publicDataCache.data?.pages || {}),
                gallery: galleryData && galleryData.length > 0 ? galleryData : (publicDataCache.data?.gallery || []),
                contact: contactData?.value || publicDataCache.data?.contact || {},
              };

              publicDataCache.data = offloadPayload(payload);
              publicDataCache.timestamp = Date.now();
              return publicDataCache.data;
            } catch (innerErr) {
              console.warn('[Public-Data In-Flight Error]:', innerErr.message);
              if (publicDataCache.data) return publicDataCache.data;
              return { events: [], members: [], pages: {}, gallery: [], contact: {} };
            } finally {
              publicDataInFlight = null;
            }
          })();
        }

        try {
          const payload = await publicDataInFlight;
          res.setHeader('X-Cache', 'MISS');
          return res.json(payload);
        } catch (dbErr) {
          // Graceful fallback to existing cache on statement timeout / lock contention
          if (publicDataCache.data) {
            console.warn('[Public-Data Timeout Fallback] Serving cached data due to DB load:', dbErr.message);
            res.setHeader('X-Cache', 'STALE-FALLBACK');
            return res.json(publicDataCache.data);
          }
          return res.json({ events: [], members: [], pages: {}, gallery: [], contact: {} });
        }
      }

      if (type === 'events') {
        const { data, error } = await supabase.from('events').select('*').eq('is_published', true).order('date', { ascending: false });
        if (error) throw error;
        return res.json(offloadRows('events', data || []));
      }

      if (type === 'members') {
        const { data, error } = await fetchMembersLight(supabase);
        if (error) throw error;
        return res.json(data || []);
      }

      if (type === 'gallery') {
        const { data, error } = await supabase.from('gallery_images').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return res.json(offloadRows('gallery_images', data || []));
      }

      if (type === 'page') {
        const slug = req.query.slug;
        const { data, error } = await supabase.from('pages').select('*').eq('slug', slug).maybeSingle();
        if (error) throw error;
        return res.json(data || {});
      }

      if (type === 'contact') {
        const { data, error } = await supabase.from('contact_settings').select('value').eq('key', 'contact_info').maybeSingle();
        if (error) throw error;
        return res.json(data?.value || {});
      }

      return res.status(400).json({ error: `Invalid data type: ${type}` });
    } catch (err) {
      console.error('Error in /public-data:', err.message);
      if (publicDataCache.data) {
        return res.json(publicDataCache.data);
      }
      return res.status(500).json({ error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // 3. SECURE ADMIN LOGIN (Server-Side Authentication & Session Cookie)
  // ---------------------------------------------------------------------------
  router.post('/login', async (req, res) => {
    try {
      const { username, password } = req.body || {};

      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
      }

      const cleanUsername = String(username).trim();
      const cleanPassword = String(password).trim();

      // Brute-force guard (replaces the old CAPTCHA)
      const limitKeys = [`ip:${clientIp(req)}`, `user:${cleanUsername.toLowerCase()}`];
      const lockedFor = loginLockRemaining(limitKeys);
      if (lockedFor) {
        return res.status(429).json({ error: `Too many failed attempts. Try again in ${Math.ceil(lockedFor / 60000)} minute(s).` });
      }

      // 2. Query admin user from live database
      let user = null;
      if (supabase) {
        const { data: dbUser, error: uErr } = await supabase
          .from('admin_users')
          .select('*')
          .ilike('username', cleanUsername)
          .eq('active', true)
          .maybeSingle();

        if (dbUser && !uErr) {
          user = dbUser;
        }
      }

      if (!user) {
        bcrypt.compareSync('dummy', '$2a$12$DummySaltForTimingAttackPreventionOnlyDoNotUse');
        recordLoginFailure(limitKeys);
        return res.status(401).json({ error: 'Invalid username or password.' });
      }

      // 3. Verify Password Hash
      if (user.password_hash) {
        const match = bcrypt.compareSync(cleanPassword, user.password_hash);
        if (!match) {
          recordLoginFailure(limitKeys);
        return res.status(401).json({ error: 'Invalid username or password.' });
        }
      }

      // 4. Issue Secure HttpOnly JWT Session Cookie
      const sessionPayload = {
        id: user.id,
        username: user.username,
        role: user.role || 'admin',
      };

      const sessionToken = jwt.sign(sessionPayload, sessionSecret, { expiresIn: '24h' });

      clearLoginFailures(limitKeys);
      res.setHeader('Set-Cookie', serializeCookie('acm_session', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24, // 24 hours
      }));

      // Record successful audit log
      if (supabase) {
        try {
          await supabase.from('audit_logs').insert({
            admin_username: user.username,
            action: 'admin_login',
            resource: 'auth',
            details: 'Successful administrator login',
          });
        } catch (e) {}
      }

      return res.json({
        success: true,
        user: {
          username: user.username,
          role: user.role || 'admin',
        },
      });
    } catch (err) {
      console.error('Login error:', err);
      return res.status(500).json({ error: 'Internal Authentication Error' });
    }
  });

  // ---------------------------------------------------------------------------
  // 4. SESSION VERIFICATION & LOGOUT
  // ---------------------------------------------------------------------------
  router.get('/me', (req, res) => {
    const session = verifyAdminSession(req);
    if (!session) {
      return res.json({ authenticated: false, user: null });
    }
    return res.json({
      authenticated: true,
      user: {
        username: session.username,
        role: session.role,
      },
    });
  });

  router.post('/logout', async (req, res) => {
    res.setHeader('Set-Cookie', serializeCookie('acm_session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    }));
    return res.json({ success: true, message: 'Logged out successfully' });
  });

  // ---------------------------------------------------------------------------
  // 5. CMS CRUD OPERATIONS (Authenticated)
  // ---------------------------------------------------------------------------
  const ALLOWED_TABLES = [
    'events',
    'members',
    'gallery_albums',
    'gallery_images',
    'pages',
    'site_settings',
    'contact_settings',
    'audit_logs',
    'form_submissions',
  ];

  router.use('/admin-crud', (req, res, next) => {
    const session = verifyAdminSession(req);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized. Administrative session expired or missing.' });
    }
    req.admin = session;
    next();
  });

  router.get('/admin-crud', async (req, res) => {
    const table = req.query.table;
    if (!table || !ALLOWED_TABLES.includes(table)) {
      return res.status(400).json({ error: 'Invalid table requested' });
    }
    if (!supabase) return res.status(503).json({ error: 'Database unconfigured' });

    try {
      let query = supabase.from(table).select('*');
      if (table === 'audit_logs') query = query.order('timestamp', { ascending: false }).limit(200);
      else if (table === 'members') query = query.order('display_order', { ascending: true });
      else if (table === 'events') query = query.order('date', { ascending: false });
      else if (table === 'gallery_images') query = query.order('created_at', { ascending: false });
      else if (table === 'pages') query = query.order('slug', { ascending: true });
      else if (table === 'form_submissions') query = query.order('created_at', { ascending: false }).limit(1000);

      const { data, error } = await query;
      if (error) throw error;
      return res.json(data || []);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Helper to safely execute Supabase operations with automatic column fallback
  async function safeSupabaseExecute(fnBuilder, initialBody) {
    let currentBody = { ...initialBody };
    for (let attempt = 0; attempt < 8; attempt++) {
      const query = fnBuilder(currentBody);
      const { data, error } = await query;
      if (!error) return { data, error: null };

      // Check for PostgREST schema cache missing column error
      const match = error.message?.match(/Could not find the '([^']+)' column of '([^']+)' in the schema cache/i);
      if (match && match[1] && currentBody.hasOwnProperty(match[1])) {
        const missingCol = match[1];
        delete currentBody[missingCol];
        continue;
      }
      return { data, error };
    }
    return { data: null, error: new Error('Failed to execute database query after column fallbacks') };
  }

  router.post('/admin-crud', async (req, res) => {
    const table = req.query.table;
    let body = req.body;
    if (!table || !ALLOWED_TABLES.includes(table)) return res.status(400).json({ error: 'Invalid table' });
    if (!supabase) return res.status(503).json({ error: 'Database unconfigured' });
    // Never let a /api/media/... link overwrite the stored image (see restoreMediaRefs)
    body = Array.isArray(body)
      ? await Promise.all(body.map(item => restoreMediaRefs(supabase, table, item)))
      : await restoreMediaRefs(supabase, table, body);

    try {
      const { data, error } = await safeSupabaseExecute((payload) => {
        return supabase.from(table).insert(payload).select().single();
      }, body);

      if (error) throw error;

      // Invalidate public cached data instantly so fresh changes are served immediately
      invalidatePublicCache();

      // Log audit
      await supabase.from('audit_logs').insert({
        admin_username: req.admin.username,
        action: `create_${table}`,
        resource: table,
        resource_id: data.id || data.slug || data.key,
        details: `Created new item in ${table}`,
      }).then(() => {}).catch(() => {});

      return res.status(201).json(data);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  router.put('/admin-crud', async (req, res) => {
    const table = req.query.table;
    let body = req.body;
    if (!table || !ALLOWED_TABLES.includes(table)) return res.status(400).json({ error: 'Invalid table' });
    if (!supabase) return res.status(503).json({ error: 'Database unconfigured' });
    // Never let a /api/media/... link overwrite the stored image (see restoreMediaRefs)
    body = Array.isArray(body)
      ? await Promise.all(body.map(item => restoreMediaRefs(supabase, table, item)))
      : await restoreMediaRefs(supabase, table, body);

    try {
      if (Array.isArray(body)) {
        // Sequential updates in small chunks to prevent lock contention
        for (const item of body) {
          if (!item.id) continue;
          await safeSupabaseExecute((payload) => {
            return supabase.from(table).update(payload).eq('id', payload.id);
          }, item);
        }

        invalidatePublicCache();
        return res.json({ success: true, count: body.length });
      }

      const { data, error } = await safeSupabaseExecute((payload) => {
        if (table === 'pages') {
          const cleanPayload = { ...payload };
          if (!cleanPayload.id) delete cleanPayload.id;
          return supabase.from('pages').upsert(cleanPayload, { onConflict: 'slug' }).select().single();
        } else if (table === 'contact_settings' || table === 'site_settings') {
          return supabase.from(table).upsert(payload, { onConflict: 'key' }).select().single();
        } else {
          if (!payload.id) throw new Error('Missing row ID for update');
          return supabase.from(table).update(payload).eq('id', payload.id).select().single();
        }
      }, body);

      if (error) throw error;

      // Invalidate public cached data instantly
      invalidatePublicCache();

      // Log audit
      await supabase.from('audit_logs').insert({
        admin_username: req.admin.username,
        action: `update_${table}`,
        resource: table,
        resource_id: body.id || body.slug || body.key,
        details: `Updated record in ${table}`,
      }).then(() => {}).catch(() => {});

      return res.json(data);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  router.delete('/admin-crud', async (req, res) => {
    const table = req.query.table;
    const id = req.query.id;
    if (!table || !ALLOWED_TABLES.includes(table) || !id) return res.status(400).json({ error: 'Invalid table or ID' });
    if (!supabase) return res.status(503).json({ error: 'Database unconfigured' });

    try {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;

      // Invalidate public cached data instantly
      invalidatePublicCache();

      await supabase.from('audit_logs').insert({
        admin_username: req.admin.username,
        action: `delete_${table}`,
        resource: table,
        resource_id: id,
        details: `Deleted item ${id} from ${table}`,
      }).then(() => {}).catch(() => {});

      return res.json({ success: true, id });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // 6. OBJECT STORAGE MEDIA UPLOAD (Authenticated)
  // ---------------------------------------------------------------------------
  // Serves one image that is still stored inline (base64) in a row — see server/inlineMedia.js
  router.get('/media/:table/:key/:field', async (req, res) => {
    try {
      const media = await loadInlineMedia(supabase, req.params.table, req.params.key, req.params.field);
      if (!media) return res.status(404).json({ error: 'Not found' });
      if (media.redirect) return res.redirect(302, media.redirect);
      res.setHeader('Content-Type', media.type);
      res.setHeader('Cache-Control', MEDIA_CACHE_HEADER);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox"); // SVGs can't run scripts
      return res.send(media.buffer);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  router.post('/upload', async (req, res) => {
    const session = verifyAdminSession(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    if (!supabase) return res.status(503).json({ error: 'Database unconfigured' });

    try {
      const { name, type, body } = req.body || {};
      if (!body) return res.status(400).json({ error: 'Missing image payload' });

      const rawBase64 = String(body).replace(/^data:image\/[a-zA-Z+.-]+;base64,/, '').trim();
      const buffer = Buffer.from(rawBase64, 'base64');
      const ext = (name && name.includes('.')) ? name.split('.').pop() : 'jpg';
      const cleanFileName = `uploads/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

      let { data: uploadData, error: uploadErr } = await supabase
        .storage
        .from('acm-media')
        .upload(cleanFileName, buffer, {
          contentType: type || 'image/jpeg',
          upsert: true,
        });

      // Auto-create bucket if missing
      if (uploadErr && (uploadErr.message?.includes('Bucket not found') || uploadErr.error === 'Bucket not found' || uploadErr.statusCode === '404')) {
        try {
          await supabase.storage.createBucket('acm-media', { public: true });
          const retryRes = await supabase
            .storage
            .from('acm-media')
            .upload(cleanFileName, buffer, {
              contentType: type || 'image/jpeg',
              upsert: true,
            });
          uploadErr = retryRes.error;
          uploadData = retryRes.data;
        } catch (bErr) {
          console.warn('Bucket auto-create notice:', bErr.message);
        }
      }

      if (uploadErr) {
        // Storage not set up (no acm-media bucket / no secret key): store the image inline instead.
        // Safe now because uploads arrive pre-shrunk (~150KB WebP, see api.uploadImage) and public
        // pages read inline images through /api/media, not inside the page data.
        // ponytail: inline cap 1.5MB; Supabase Storage is still the better home (CDN, no DB weight).
        const INLINE_MAX = 1.5 * 1024 * 1024;
        if (buffer.length <= INLINE_MAX) {
          console.warn('Storage unavailable, storing image inline:', uploadErr.message || uploadErr);
          return res.json({ url: `data:${type || 'image/jpeg'};base64,${rawBase64}`, path: 'inline' });
        }
        return res.status(503).json({
          error: 'Image is too large to store without Supabase Storage. Use a smaller image, or set up the public "acm-media" bucket and the secret SUPABASE_SERVICE_ROLE_KEY.',
        });
      }

      const { data: publicUrlData } = supabase
        .storage
        .from('acm-media')
        .getPublicUrl(cleanFileName);

      return res.json({
        url: publicUrlData.publicUrl,
        path: cleanFileName,
      });
    } catch (err) {
      console.error('Upload error:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // 7. CONTACT ENQUIRY & AUTOMATED SMTP DISPATCH
  // ---------------------------------------------------------------------------
  router.post('/contact', createFormHandler('contact', supabase));
  router.post('/apply', createFormHandler('join', supabase));

  return router;
}

export function createApiMiddleware() {
  const router = createApiRouter();
  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  app.use(router);
  return app;
}

