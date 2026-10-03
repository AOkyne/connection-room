// Idempotent import plan for supabase/seed/experience-seed-questions.json.
// Matches on the stable seed id (never on text), so it can be re-run any
// number of times:
// - seeds not yet in the database are inserted (approved, NOT activated --
//   a seed only gets a thread when it's first actually sent);
// - seeds already present are left untouched: identity, invitation
//   history and staff edits are preserved;
// - if the seed FILE's wording changed since the last import, the change
//   is reported for an explicit admin "apply update" (blocked if staff
//   have edited that question) -- never a silent overwrite;
// - a new seed whose text duplicates an existing question is skipped and
//   reported; one that merely resembles one is imported but flagged.

import { findSimilarQuestion, normalizeQuestionText } from "./normalize";

export interface SeedFile {
  version: number;
  topics: { slug: string; label: string; sensitive: boolean }[];
  questions: { id: string; topic: string; text: string }[];
}

export interface ExistingQuestionRow {
  id: string;
  seed_key: string | null;
  text: string;
  normalized_text: string;
  seed_imported_text: string | null;
  staff_edited: boolean;
}

export interface SeedImportPlan {
  insert: Array<{ seedKey: string; topic: string; text: string; normalized: string; similarToId: string | null }>;
  unchanged: string[];
  upstreamChanged: Array<{ questionId: string; seedKey: string; currentText: string; newText: string; staffEdited: boolean }>;
  duplicateText: Array<{ seedKey: string; existingQuestionId: string }>;
  unknownTopic: string[];
}

export function planSeedImport(file: SeedFile, existing: ExistingQuestionRow[], knownTopics: Set<string>): SeedImportPlan {
  const plan: SeedImportPlan = { insert: [], unchanged: [], upstreamChanged: [], duplicateText: [], unknownTopic: [] };
  const bySeedKey = new Map(existing.filter((q) => q.seed_key).map((q) => [q.seed_key as string, q]));
  const byNormalized = new Map(existing.map((q) => [q.normalized_text, q]));
  const seenKeys = new Set<string>();

  for (const seed of file.questions) {
    if (seenKeys.has(seed.id)) continue; // duplicate id inside the file: first wins
    seenKeys.add(seed.id);
    const text = seed.text.trim();
    const current = bySeedKey.get(seed.id);
    if (current) {
      if ((current.seed_imported_text ?? current.text) === text) plan.unchanged.push(seed.id);
      else {
        plan.upstreamChanged.push({
          questionId: current.id,
          seedKey: seed.id,
          currentText: current.text,
          newText: text,
          staffEdited: current.staff_edited,
        });
      }
      continue;
    }
    if (!knownTopics.has(seed.topic)) {
      plan.unknownTopic.push(seed.id);
      continue;
    }
    const normalized = normalizeQuestionText(text);
    const dup = byNormalized.get(normalized);
    if (dup) {
      plan.duplicateText.push({ seedKey: seed.id, existingQuestionId: dup.id });
      continue;
    }
    const similar = findSimilarQuestion(text, existing);
    plan.insert.push({ seedKey: seed.id, topic: seed.topic, text, normalized, similarToId: similar?.id || null });
    byNormalized.set(normalized, { id: `pending:${seed.id}`, seed_key: seed.id, text, normalized_text: normalized, seed_imported_text: text, staff_edited: false });
  }
  return plan;
}
