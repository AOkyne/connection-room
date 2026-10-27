-- 106: Editable Terms of Service / Privacy Policy, with tracked changes.
--
-- The legal pages (/terms, /privacy) are edited inside the app: admins in
-- /app/admin/legal, and outside reviewers (e.g. the lawyer) through a
-- private edit link that needs no account. Every save is kept as a
-- version with who made it, so the editor can show tracked changes
-- (who added/removed what since the last publish) and any version can be
-- restored. Only an admin can publish; /terms and /privacy show the
-- published copy.
--
-- legal_documents         one row per page: current draft + published copy
-- legal_document_versions every saved draft (one person's saves within a
--                         few minutes are merged into one version)
-- legal_edit_links        private edit links, one per reviewer; revocable
--
-- Admin/reviewer only, read and written by API routes on the service-role
-- key: RLS on with no policies, grants to service_role only (explicit
-- grants are required for new tables -- see migration 100).
--
-- ROLLBACK:
-- DROP TABLE IF EXISTS legal_document_versions;
-- DROP TABLE IF EXISTS legal_edit_links;
-- DROP TABLE IF EXISTS legal_documents;

CREATE TABLE IF NOT EXISTS legal_documents (
  slug TEXT PRIMARY KEY CHECK (slug IN ('terms', 'privacy', 'notes')),
  draft_html TEXT NOT NULL,
  draft_version_id UUID,
  draft_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  draft_updated_by TEXT NOT NULL,
  published_html TEXT,
  published_version_id UUID,
  published_at TIMESTAMPTZ,
  published_by TEXT
);

CREATE TABLE IF NOT EXISTS legal_document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL REFERENCES legal_documents(slug) ON DELETE CASCADE,
  html TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_kind TEXT NOT NULL CHECK (author_kind IN ('admin', 'reviewer', 'system')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS legal_document_versions_slug_idx
  ON legal_document_versions (slug, created_at);

CREATE TABLE IF NOT EXISTS legal_edit_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  person_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);

ALTER TABLE legal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_edit_links ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON legal_documents FROM anon, authenticated;
REVOKE ALL ON legal_document_versions FROM anon, authenticated;
REVOKE ALL ON legal_edit_links FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON legal_documents TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON legal_document_versions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON legal_edit_links TO service_role;
