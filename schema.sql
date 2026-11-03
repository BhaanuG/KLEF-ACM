-- KLEF ACM Student Chapter Database Schema
-- Run this in the Supabase SQL Editor to initialize all tables, triggers, and indexes.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Trigger function to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

--------------------------------------------------------------------------------
-- 1. admin_users
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TRIGGER update_admin_users_updated_at
    BEFORE UPDATE ON admin_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Administrators are NOT seeded here (no default passwords in source control).
-- Create one with a bcrypt hash generated locally, e.g.:
--   node -e "console.log(require('bcryptjs').hashSync(process.argv[1], 12))" 'your-strong-password'
--   INSERT INTO admin_users (username, password_hash, role, active)
--   VALUES ('you@example.com', '<paste hash>', 'superadmin', true);

--------------------------------------------------------------------------------
-- 2. site_settings
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TRIGGER update_site_settings_updated_at
    BEFORE UPDATE ON site_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

--------------------------------------------------------------------------------
-- 3. contact_settings
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contact_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TRIGGER update_contact_settings_updated_at
    BEFORE UPDATE ON contact_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

--------------------------------------------------------------------------------
-- 4. pages
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    content JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TRIGGER update_pages_updated_at
    BEFORE UPDATE ON pages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

--------------------------------------------------------------------------------
-- 5. events
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    venue TEXT NOT NULL,
    speaker TEXT NOT NULL,
    registration_link TEXT,
    image_url TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_published BOOLEAN NOT NULL DEFAULT false,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE events ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_published ON events(is_published);
CREATE INDEX IF NOT EXISTS idx_events_display_order ON events(display_order);

--------------------------------------------------------------------------------
-- 6. members
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'student_member', -- 'faculty_coordinator', 'chair', 'vice_chair', 'secretary', 'treasurer', 'webmaster', 'technical_lead', 'other_lead', 'student_member'
    photograph_url TEXT,
    biography TEXT,
    linkedin_url TEXT,
    github_url TEXT,
    portfolio_url TEXT,
    twitter_url TEXT,
    social_links JSONB DEFAULT '[]'::jsonb,
    email TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure non-destructive migrations for existing databases
ALTER TABLE members ADD COLUMN IF NOT EXISTS github_url TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS portfolio_url TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS twitter_url TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '[]'::jsonb;
ALTER TABLE members ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

CREATE TRIGGER update_members_updated_at
    BEFORE UPDATE ON members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_members_category_order ON members(category, display_order);

--------------------------------------------------------------------------------
-- 7. gallery_albums
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gallery_albums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TRIGGER update_gallery_albums_updated_at
    BEFORE UPDATE ON gallery_albums
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

--------------------------------------------------------------------------------
-- 8. gallery_images
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gallery_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    album_id UUID REFERENCES gallery_albums(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    caption TEXT,
    category TEXT, -- e.g. 'workshops', 'competitions', 'seminars', 'socials'
    description TEXT,
    event_date DATE,
    images JSONB DEFAULT '[]'::jsonb,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE gallery_images ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
ALTER TABLE gallery_images ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;
ALTER TABLE gallery_images ADD COLUMN IF NOT EXISTS event_date DATE;

-- Safe migration query for existing databases
ALTER TABLE gallery_images ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE gallery_images ADD COLUMN IF NOT EXISTS event_date DATE;
ALTER TABLE gallery_images ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

CREATE TRIGGER update_gallery_images_updated_at
    BEFORE UPDATE ON gallery_images
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

--------------------------------------------------------------------------------
-- 9. captcha_challenges
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS captcha_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT UNIQUE NOT NULL,
    hash TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Safe migration query for existing databases
ALTER TABLE captcha_challenges ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_captcha_token ON captcha_challenges(token);
CREATE INDEX IF NOT EXISTS idx_captcha_expires ON captcha_challenges(expires_at);

--------------------------------------------------------------------------------
-- 10. audit_logs
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID,
    admin_username TEXT,
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    resource_id TEXT,
    details TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

--------------------------------------------------------------------------------
-- Seed Site Settings, Pages, and Contact Details
--------------------------------------------------------------------------------

-- Seed initial contact settings
INSERT INTO contact_settings (key, value) VALUES (
    'contact_info',
    '{
        "email": "acm.studentchapter@kluniversity.in",
        "phone": "+91 86323 99999",
        "address": "KLEF ACM Student Chapter, Department of Computer Science & Engineering, KL Deemed to be University, Green Fields, Vaddeswaram, Andhra Pradesh 522302",
        "social_links": {
            "linkedin": "https://www.linkedin.com/company/klef-acm-student-chapter",
            "instagram": "https://www.instagram.com/klef_acm",
            "github": "https://github.com/klef-acm-sc"
        },
        "map_url": "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3826.664448574163!2d80.62024107577579!3d16.441852029302636!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a35f0a2a0000001%3A0x6d7088b209d84bfd!2sK%20L%20University!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin"
    }'::jsonb
) ON CONFLICT (key) DO NOTHING;

-- Seed page contents (home page stats, intro, achievements, etc.)
INSERT INTO pages (slug, title, content) VALUES (
    'home',
    'Home Page Content',
    '{
        "hero": {
            "title": "Empowering Future Computing Professionals",
            "subtitle": "KLEF ACM Student Chapter at KL Deemed to be University",
            "description": "A community of students and faculty at KL University advancing computing through workshops, research, hackathons and competitive programming.",
            "cta_events": "Explore Events",
            "cta_members": "Meet Our Team"
        },
        "stats": {
            "events_count": 25,
            "members_count": 120,
            "workshops_count": 15,
            "projects_count": 8
        },
        "introduction": {
            "heading": "Advancing Computing as a Science & Profession",
            "text": "The KLEF ACM Student Chapter is dedicated to promoting a deeper understanding of computing, software engineering, and technological research among student developers. Through guest lectures, coding bootcamps, and national hackathons, we bridge the gap between academic theory and industry excellence."
        },
        "achievements": [
            {
                "title": "Best Student Chapter Award Nominee",
                "description": "Recognized for conducting high-impact technical workshops and hackathons."
            },
            {
                "title": "Smart India Hackathon Finalists",
                "description": "Multiple student teams mentored by our chapter reached the national grand finale."
            }
        ]
    }'::jsonb
),
(
    'about-klef-acm',
    'About KLEF ACM Chapter',
    '{
        "introduction": "Established under the Department of Computer Science & Engineering, the KLEF ACM Student Chapter serves as a hub of technical excellence at KL Deemed to be University.",
        "vision": "To create a self-sustaining environment of computational excellence, technological innovation, and peer-to-peer mentorship that shapes students into global leaders in computer science.",
        "mission": "To provide students with technical exposure, industry-relevant workshops, research guidance, and competitive programming challenges, maintaining a high standard of professional ethics.",
        "activities": [
            "Technical Workshops on Web Dev, AI/ML, Cloud Computing",
            "National-level Hackathons and Competitive Programming Contests",
            "Collaborative Research projects and Paper Presentations",
            "Mentorship sessions by alumni and industry experts"
        ]
    }'::jsonb
),
(
    'about-acm',
    'About Global ACM',
    '{
        "heading": "The World’s Largest Educational and Scientific Computing Society",
        "intro": "ACM brings together computing educators, researchers, and professionals to inspire dialogue, share resources, and address the field’s challenges. As the world’s largest computing society, ACM strengthens the profession’s collective voice through strong leadership, promotion of the highest standards, and recognition of technical excellence.",
        "mission": "ACM is an educational and scientific society dedicated to advancing computing as a science and a profession. ACM members are computing professionals, educators, and students who have joined together to discover new technologies, enrich their careers, and contribute to the computing community.",
        "pillars": [
            {
                "title": "Advancing Computing as a Science and Profession",
                "desc": "ACM raises the momentum of computing innovation, providing the world’s leading digital library and organizing premier conferences."
            },
            {
                "title": "Fostering Global Community",
                "desc": "With members and chapters around the globe, ACM provides a rich platform for peer collaboration and career growth."
            },
            {
                "title": "Promoting Highest Standards & Ethics",
                "desc": "The ACM Code of Ethics and Professional Conduct sets the global gold standard for computing practitioners."
            }
        ]
    }'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

--------------------------------------------------------------------------------
-- 11. Row Level Security (RLS) & Access Policies
--------------------------------------------------------------------------------
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE captcha_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Public access rules live in supabase/001_lockdown_and_forms.sql (run it after this file).

--------------------------------------------------------------------------------
-- 12. Storage Bucket Creation & Permissions
--------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('acm-media', 'acm-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Public Read Media" ON storage.objects FOR SELECT USING (bucket_id = 'acm-media');
