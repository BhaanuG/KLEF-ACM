/**
 * Pure API Client for KLEF ACM Student Chapter Website
 * Connects directly to the live backend server / serverless API.
 * Strict Server-Side Session and Database driven. NO localStorage / sessionStorage.
 */

// Static host (klef.acm.org): VITE_API_BASE points at the backend on Vercel. Unset = same origin.
const API_ORIGIN = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '');
const API_BASE = `${API_ORIGIN}/api`;
const CLIENT_CACHE_KEY = 'klu_acm_client_public_cache_v2';
let clientMemoryCache = null;

/**
 * Helper to handle fetch responses and extract JSON/errors cleanly
 */
// The API returns inline images as relative /api/media/... links; make them absolute on a static host.
// Admin always runs on the backend's own origin (API_ORIGIN empty), so stored links are never rewritten.
function resolveMediaLinks(data) {
  if (!API_ORIGIN) return data;
  return JSON.parse(JSON.stringify(data).replaceAll('"/api/media/', `"${API_ORIGIN}/api/media/`));
}

async function handleResponse(response) {
  let data;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    const text = await response.text();
    data = { text };
  }

  if (!response.ok) {
    const errorMsg = data?.error || (response.status === 401 ? 'Invalid username or password.' : 'API Request Failed');
    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  // ---------------------------------------------------------------------------
  // CLIENT-SIDE INSTANT CACHING (Stale-While-Revalidate)
  // ---------------------------------------------------------------------------
  
  /**
   * Synchronously returns cached public site data for instant 0ms app boot
   */
  getCachedPublicData() {
    if (clientMemoryCache) return clientMemoryCache;
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const item = window.sessionStorage.getItem(CLIENT_CACHE_KEY);
        if (item) {
          const parsed = JSON.parse(item);
          if (parsed && typeof parsed === 'object') {
            clientMemoryCache = parsed;
            return parsed;
          }
        }
      }
    } catch {}
    return null;
  },

  /**
   * Updates synchronous client cache
   */
  setCachedPublicData(data) {
    if (!data) return;
    clientMemoryCache = data;
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem(CLIENT_CACHE_KEY, JSON.stringify(data));
      }
    } catch {}
  },

  /**
   * Clears client cache
   */
  clearCachedPublicData() {
    clientMemoryCache = null;
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.removeItem(CLIENT_CACHE_KEY);
      }
    } catch {}
  },

  // ---------------------------------------------------------------------------
  // PUBLIC WEBSITE ENDPOINTS
  // ---------------------------------------------------------------------------
  
  /**
   * Fetches authoritative live data for the public website with background cache update.
   * @param {string} type - 'all', 'events', 'members', 'gallery', 'page', 'contact'
   * @param {string} [slug] - Required if type is 'page'
   */
  async getPublicData(type = 'all', slug = '') {
    let url = `${API_BASE}/public-data?type=${type}`;
    if (slug) url += `&slug=${slug}`;
    const res = await fetch(url);
    const data = resolveMediaLinks(await handleResponse(res));
    if (type === 'all' && data) {
      this.setCachedPublicData(data);
    }
    return data;
  },

  /**
   * Submits a user contact enquiry and dispatches automated SMTP emails
   */
  async sendContactInquiry(formData) {
    const res = await fetch(`${API_BASE}/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    return handleResponse(res);
  },

  // ---------------------------------------------------------------------------
  // AUTHENTICATION (Server-Controlled HttpOnly Cookies)
  // ---------------------------------------------------------------------------

  /**
   * Submits credentials for server authentication
   */
  async login(username, password) {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        password,
      }),
      credentials: 'same-origin',
    });
    return handleResponse(res);
  },

  /**
   * Invalidates administrator session cookie
   */
  async logout() {
    const res = await fetch(`${API_BASE}/logout`, {
      method: 'POST',
      credentials: 'same-origin',
    });
    return handleResponse(res);
  },

  /**
   * Checks current administrator session state from server cookie
   */
  async checkSession() {
    const res = await fetch(`${API_BASE}/me`, {
      credentials: 'same-origin',
    });
    return handleResponse(res);
  },

  // ---------------------------------------------------------------------------
  // CMS CRUD OPERATIONS (Server-Authenticated)
  // ---------------------------------------------------------------------------

  /**
   * Fetches all records from an administrative table
   */
  async getTable(table) {
    const res = await fetch(`${API_BASE}/admin-crud?table=${table}`, {
      credentials: 'same-origin',
    });
    return handleResponse(res);
  },

  /**
   * Inserts a new record into a CMS table
   */
  async createRow(table, data) {
    const res = await fetch(`${API_BASE}/admin-crud?table=${table}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'same-origin',
    });
    return handleResponse(res);
  },

  /**
   * Updates an existing record in a CMS table
   */
  async updateRow(table, data) {
    const res = await fetch(`${API_BASE}/admin-crud?table=${table}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'same-origin',
    });
    return handleResponse(res);
  },

  /**
   * Batch updates multiple records in a single request to prevent connection pool exhaustion
   */
  async updateRows(table, dataArray) {
    const res = await fetch(`${API_BASE}/admin-crud?table=${table}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dataArray),
      credentials: 'same-origin',
    });
    return handleResponse(res);
  },

  /**
   * Deletes a record from a CMS table
   */
  async deleteRow(table, id) {
    const res = await fetch(`${API_BASE}/admin-crud?table=${table}&id=${id}`, {
      method: 'DELETE',
      credentials: 'same-origin',
    });
    return handleResponse(res);
  },

  /**
   * Uploads an image payload to object storage and returns the permanent public URL
   */
  async uploadImage(name, type, base64Body) {
    const img = await shrinkImage(name, type, base64Body);
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(img),
      credentials: 'same-origin',
    });
    return handleResponse(res);
  },
};

const MAX_UPLOAD_DIM = 1600; // px, longest side — plenty for banners and portraits
const TARGET_BYTES = 600 * 1024; // keep well under the server's 1.5MB inline limit

// Downscale + re-encode in the browser so a 5MB phone photo uploads as ~200KB.
// WebP where the browser can encode it (keeps PNG transparency), otherwise JPEG (Safari),
// stepping quality down until the result fits. SVG/GIF pass through untouched.
async function shrinkImage(name, type, base64Body) {
  const raw = String(base64Body).replace(/^data:[^,]*,/, '');
  if (!/^image\//i.test(type || '') || /svg|gif/i.test(type)) return { name, type, body: raw };
  try {
    const bitmap = await createImageBitmap(await (await fetch(`data:${type};base64,${raw}`)).blob());
    const webp = document.createElement('canvas').toDataURL('image/webp').startsWith('data:image/webp');
    const outType = webp ? 'image/webp' : 'image/jpeg';
    let body = raw;
    let dim = Math.min(1, MAX_UPLOAD_DIM / Math.max(bitmap.width, bitmap.height));
    // Shrink quality first, then dimensions, until it fits
    for (let pass = 0; pass < 4; pass++, dim *= 0.7) {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * dim));
      canvas.height = Math.max(1, Math.round(bitmap.height * dim));
      const ctx = canvas.getContext('2d');
      if (!webp) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); } // JPEG has no alpha
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (const q of [0.85, 0.7, 0.55]) {
        body = canvas.toDataURL(outType, q).split(',')[1];
        if (body.length * 0.75 <= TARGET_BYTES) break;
      }
      if (body.length * 0.75 <= TARGET_BYTES) break;
    }
    if (body.length >= raw.length && /^image\/(jpe?g|png|webp)$/i.test(type)) return { name, type, body: raw };
    return { name: name.replace(/\.[^.]+$/, '') + (webp ? '.webp' : '.jpg'), type: outType, body };
  } catch {
    return { name, type, body: raw };
  }
}
