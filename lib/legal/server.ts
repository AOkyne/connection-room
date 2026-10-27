// Server side of the legal pages workspace: who is editing, seeding the
// first drafts, loading drafts with tracked changes, saving and publishing.
// Service-role only (the tables have no client grants, migration 106).

import { NextRequest } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth/require-admin";
import { sanitizeLegalHtml } from "./sanitize";
import { trackChanges, type TrackedChanges } from "./diff";
import { LEGAL_PAGES, SEED_AUTHOR, seedHtml, type LegalSlug } from "./seed";

/** One person's saves within this window are merged into a single version. */
const MERGE_WINDOW_MS = 15 * 60 * 1000;

export type LegalActor =
  | { ok: true; kind: "admin"; name: string; userId: string; supabase: SupabaseClient }
  | { ok: true; kind: "reviewer"; name: string; linkId: string; supabase: SupabaseClient }
  | { ok: false; status: number; error: string };

function serviceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key) : null;
}

/**
 * A reviewer's private edit link (x-legal-token header) or a signed-in
 * admin (Bearer token). Edits are recorded under the reviewer's name as
 * entered when the link was made, or the admin's profile name.
 */
export async function resolveLegalActor(request: NextRequest): Promise<LegalActor> {
  const token = request.headers.get("x-legal-token");
  if (token) {
    const supabase = serviceClient();
    if (!supabase) return { ok: false, status: 500, error: "Missing Supabase configuration" };
    const { data: link } = await supabase
      .from("legal_edit_links")
      .select("id, person_name, revoked_at")
      .eq("token", token)
      .maybeSingle();
    if (!link || link.revoked_at) {
      return { ok: false, status: 403, error: "This edit link is no longer active. Ask Trevor for a new one." };
    }
    await supabase.from("legal_edit_links").update({ last_used_at: new Date().toISOString() }).eq("id", link.id);
    return { ok: true, kind: "reviewer", name: link.person_name, linkId: link.id, supabase };
  }

  const auth = await requireAdmin(request);
  if (!auth.ok) return auth;
  const { data: profile } = await auth.supabase
    .from("profiles")
    .select("display_name, first_name, last_name")
    .eq("user_id", auth.userId)
    .maybeSingle();
  const name =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() || profile?.display_name || "Admin";
  return { ok: true, kind: "admin", name, userId: auth.userId, supabase: auth.supabase };
}

interface DocRow {
  slug: LegalSlug;
  draft_html: string;
  draft_version_id: string | null;
  draft_updated_at: string;
  draft_updated_by: string;
  published_html: string | null;
  published_version_id: string | null;
  published_at: string | null;
  published_by: string | null;
}

interface VersionRow {
  id: string;
  slug: LegalSlug;
  html: string;
  author_name: string;
  author_kind: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

/** Creates any page that doesn't exist yet from its first draft. */
export async function ensureSeeded(supabase: SupabaseClient): Promise<void> {
  const { data: existing } = await supabase.from("legal_documents").select("slug");
  const have = new Set((existing || []).map((r: { slug: string }) => r.slug));
  for (const page of LEGAL_PAGES) {
    if (have.has(page.slug)) continue;
    const html = sanitizeLegalHtml(seedHtml(page.slug));
    const { data: inserted } = await supabase
      .from("legal_documents")
      .upsert({ slug: page.slug, draft_html: html, draft_updated_by: SEED_AUTHOR }, { onConflict: "slug", ignoreDuplicates: true })
      .select("slug, draft_updated_at");
    if (!inserted || inserted.length === 0) continue; // another request seeded it first
    const { data: version } = await supabase
      .from("legal_document_versions")
      .insert({ slug: page.slug, html, author_name: SEED_AUTHOR, author_kind: "system" })
      .select("id")
      .single();
    if (version) {
      await supabase.from("legal_documents").update({ draft_version_id: version.id }).eq("slug", page.slug);
    }
  }
}

export interface LegalVersionMeta {
  id: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface LegalPageState {
  slug: LegalSlug;
  title: string;
  path: string | null;
  draftHtml: string;
  /** Opaque "what I last loaded" marker, sent back with a save. */
  draftRev: string;
  draftUpdatedAt: string;
  draftUpdatedBy: string;
  publishedAt: string | null;
  publishedBy: string | null;
  hasUnpublishedChanges: boolean;
  /** Since the last publish (or the first draft, if never published). */
  changes: TrackedChanges;
  changesSince: { label: string; at: string };
  history: LegalVersionMeta[];
}

export async function loadLegalWorkspace(supabase: SupabaseClient): Promise<LegalPageState[]> {
  await ensureSeeded(supabase);
  const [{ data: docs, error: docsError }, { data: versions, error: versionsError }] = await Promise.all([
    supabase.from("legal_documents").select("*"),
    supabase
      .from("legal_document_versions")
      .select("id, slug, html, author_name, author_kind, created_at, updated_at, published_at")
      .order("created_at", { ascending: true }),
  ]);
  if (docsError) throw new Error(docsError.message);
  if (versionsError) throw new Error(versionsError.message);

  const pages: LegalPageState[] = [];
  for (const meta of LEGAL_PAGES) {
    const doc = (docs as DocRow[] | null)?.find((d) => d.slug === meta.slug);
    if (!doc) continue;
    const mine = ((versions as VersionRow[] | null) || []).filter((v) => v.slug === meta.slug);

    let baseIndex = -1;
    for (let i = mine.length - 1; i >= 0; i--) {
      if (mine[i].published_at) {
        baseIndex = i;
        break;
      }
    }
    const since = baseIndex >= 0 ? mine.slice(baseIndex) : mine;
    const changes = trackChanges(since.map((v) => ({ html: v.html, author: v.author_name, at: v.updated_at })));
    const base = since[0];

    pages.push({
      slug: meta.slug,
      title: meta.title,
      path: meta.path,
      draftHtml: doc.draft_html,
      draftRev: doc.draft_updated_at,
      draftUpdatedAt: doc.draft_updated_at,
      draftUpdatedBy: doc.draft_updated_by,
      publishedAt: doc.published_at,
      publishedBy: doc.published_by,
      hasUnpublishedChanges: meta.path !== null && doc.draft_version_id !== doc.published_version_id,
      changes,
      changesSince: base
        ? { label: base.published_at ? "the last published version" : "the first draft", at: base.published_at || base.created_at }
        : { label: "the first draft", at: doc.draft_updated_at },
      history: mine
        .slice()
        .reverse()
        .map((v) => ({ id: v.id, authorName: v.author_name, createdAt: v.created_at, updatedAt: v.updated_at, publishedAt: v.published_at })),
    });
  }
  return pages;
}

export type SaveResult =
  | { ok: true; changed: boolean; draftRev: string }
  | { ok: false; status: number; error: string; conflict?: { updatedBy: string; updatedAt: string } };

const CONFLICT_MESSAGE = "Someone else saved changes to this page since you opened it.";

export async function saveLegalDraft(
  actor: Extract<LegalActor, { ok: true }>,
  slug: LegalSlug,
  rawHtml: string,
  draftRev: string
): Promise<SaveResult> {
  const { supabase } = actor;
  const html = sanitizeLegalHtml(rawHtml);
  const { data: doc } = await supabase.from("legal_documents").select("*").eq("slug", slug).maybeSingle<DocRow>();
  if (!doc) return { ok: false, status: 404, error: "Page not found." };

  if (new Date(doc.draft_updated_at).getTime() !== new Date(draftRev).getTime()) {
    return {
      ok: false,
      status: 409,
      error: CONFLICT_MESSAGE,
      conflict: { updatedBy: doc.draft_updated_by, updatedAt: doc.draft_updated_at },
    };
  }
  if (html === doc.draft_html) return { ok: true, changed: false, draftRev: doc.draft_updated_at };

  const now = new Date();
  const kind = actor.kind;
  let versionId: string | null = null;

  if (doc.draft_version_id) {
    const { data: latest } = await supabase
      .from("legal_document_versions")
      .select("id, author_name, author_kind, updated_at, published_at")
      .eq("id", doc.draft_version_id)
      .maybeSingle();
    if (
      latest &&
      latest.author_name === actor.name &&
      latest.author_kind === kind &&
      !latest.published_at &&
      now.getTime() - new Date(latest.updated_at).getTime() < MERGE_WINDOW_MS
    ) {
      await supabase.from("legal_document_versions").update({ html, updated_at: now.toISOString() }).eq("id", latest.id);
      versionId = latest.id;
    }
  }

  if (!versionId) {
    const { data: version, error } = await supabase
      .from("legal_document_versions")
      .insert({ slug, html, author_name: actor.name, author_kind: kind, created_at: now.toISOString(), updated_at: now.toISOString() })
      .select("id")
      .single();
    if (error || !version) return { ok: false, status: 500, error: error?.message || "Could not save." };
    versionId = version.id;
  }

  // Guarded on the rev we checked, so two saves racing can't both land.
  const { data: updated, error: updateError } = await supabase
    .from("legal_documents")
    .update({
      draft_html: html,
      draft_version_id: versionId,
      draft_updated_at: now.toISOString(),
      draft_updated_by: actor.name,
    })
    .eq("slug", slug)
    .eq("draft_updated_at", doc.draft_updated_at)
    .select("slug");
  if (updateError) return { ok: false, status: 500, error: updateError.message };
  if (!updated || updated.length === 0) {
    return { ok: false, status: 409, error: CONFLICT_MESSAGE };
  }
  return { ok: true, changed: true, draftRev: now.toISOString() };
}

export async function restoreLegalVersion(
  actor: Extract<LegalActor, { ok: true }>,
  versionId: string,
  draftRev: string
): Promise<SaveResult> {
  const { data: version } = await actor.supabase
    .from("legal_document_versions")
    .select("slug, html")
    .eq("id", versionId)
    .maybeSingle();
  if (!version) return { ok: false, status: 404, error: "Version not found." };
  return saveLegalDraft(actor, version.slug as LegalSlug, version.html, draftRev);
}

export async function publishLegalPage(
  actor: Extract<LegalActor, { ok: true }>,
  slug: LegalSlug
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (actor.kind !== "admin") return { ok: false, status: 403, error: "Only an admin can publish." };
  const meta = LEGAL_PAGES.find((p) => p.slug === slug);
  if (!meta?.path) return { ok: false, status: 400, error: "This page is never published." };

  const { supabase } = actor;
  const { data: doc } = await supabase.from("legal_documents").select("*").eq("slug", slug).maybeSingle<DocRow>();
  if (!doc || !doc.draft_version_id) return { ok: false, status: 404, error: "Page not found." };
  if (doc.draft_version_id === doc.published_version_id) return { ok: true };

  const now = new Date().toISOString();
  await supabase.from("legal_document_versions").update({ published_at: now }).eq("id", doc.draft_version_id);
  const { error } = await supabase
    .from("legal_documents")
    .update({
      published_html: doc.draft_html,
      published_version_id: doc.draft_version_id,
      published_at: now,
      published_by: actor.name,
    })
    .eq("slug", slug);
  if (error) return { ok: false, status: 500, error: error.message };
  return { ok: true };
}

/** For the public /terms and /privacy pages. Null until first published. */
export async function getPublishedLegalPage(slug: LegalSlug): Promise<{ html: string; publishedAt: string } | null> {
  const supabase = serviceClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("legal_documents")
    .select("published_html, published_at")
    .eq("slug", slug)
    .maybeSingle();
  if (!data?.published_html || !data.published_at) return null;
  return { html: data.published_html, publishedAt: data.published_at };
}
