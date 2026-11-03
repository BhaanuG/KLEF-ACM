-- KLEF ACM: close public database access and add the forms table.
--
-- ORDER MATTERS. Before running this:
--   1. Put the sb_secret_... key in SUPABASE_SERVICE_ROLE_KEY on Vercel and redeploy.
--   2. Check that admin login still works.
-- With only the public key configured, every admin save and login breaks once this runs.
--
-- Run once in Supabase: SQL Editor > New query > paste > Run. Safe to run again.

-- The captcha was removed from the site.
DROP TABLE IF EXISTS captcha_challenges;

-- 1. Forms inbox. No policies: only the server (secret key) can touch it.
CREATE TABLE IF NOT EXISTS form_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kind TEXT NOT NULL CHECK (kind IN ('contact', 'join')),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'new',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS form_submissions_created_idx ON form_submissions (created_at DESC);
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;

-- 2. Remove every "Allow All" rule, including ones whose names differ from schema.sql.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT schemaname, tablename, policyname FROM pg_policies
           WHERE schemaname = 'public'
             AND tablename IN ('admin_users','site_settings','contact_settings','pages','events','members',
                               'gallery_albums','gallery_images','audit_logs','form_submissions')
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 3. Read-only for the public content the website's live updates use. No public writes anywhere.
CREATE POLICY "Public read" ON events FOR SELECT USING (is_published = true);
CREATE POLICY "Public read" ON members FOR SELECT USING (is_active = true);
CREATE POLICY "Public read" ON pages FOR SELECT USING (true);
CREATE POLICY "Public read" ON gallery_albums FOR SELECT USING (true);
CREATE POLICY "Public read" ON gallery_images FOR SELECT USING (true);
CREATE POLICY "Public read" ON contact_settings FOR SELECT USING (true);

-- 4. Image storage: public can view, only the server can change.
DROP POLICY IF EXISTS "Public Upload Media" ON storage.objects;
DROP POLICY IF EXISTS "Public Update Media" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete Media" ON storage.objects;
