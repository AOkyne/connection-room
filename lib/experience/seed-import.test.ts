import { describe, it, expect } from "vitest";
import seedFile from "@/supabase/seed/experience-seed-questions.json";
import { planSeedImport, type ExistingQuestionRow, type SeedFile } from "./seed-import";
import { normalizeQuestionText } from "./normalize";

const file = seedFile as SeedFile;
const topics = new Set(file.topics.map((t) => t.slug));

function applyPlan(rows: ExistingQuestionRow[], plan: ReturnType<typeof planSeedImport>) {
  return [
    ...rows,
    ...plan.insert.map((i, n) => ({
      id: `q-${rows.length + n}`,
      seed_key: i.seedKey,
      text: i.text,
      normalized_text: i.normalized,
      seed_imported_text: i.text,
      staff_edited: false,
    })),
  ];
}

describe("seed bank importer", () => {
  it("ships 60 unique seeds with stable ids across 12 topics, 6 sensitive", () => {
    expect(file.questions.length).toBe(60);
    expect(new Set(file.questions.map((q) => q.id)).size).toBe(60);
    expect(new Set(file.questions.map((q) => normalizeQuestionText(q.text))).size).toBe(60);
    expect(file.topics.filter((t) => t.sensitive).length).toBe(6);
  });

  it("is repeatable: a second run inserts nothing", () => {
    const first = planSeedImport(file, [], topics);
    expect(first.insert.length).toBe(60);
    const rows = applyPlan([], first);
    const second = planSeedImport(file, rows, topics);
    expect(second.insert.length).toBe(0);
    expect(second.unchanged.length).toBe(60);
  });

  it("preserves staff edits and reports upstream wording changes instead of overwriting", () => {
    const rows = applyPlan([], planSeedImport(file, [], topics));
    rows[0] = { ...rows[0], text: "Staff-reworded question?", staff_edited: true };
    const changedFile: SeedFile = {
      ...file,
      questions: file.questions.map((q, i) => (i === 1 ? { ...q, text: q.text + " (revised)" } : q)),
    };
    const plan = planSeedImport(changedFile, rows, topics);
    expect(plan.insert.length).toBe(0);
    // Staff edit untouched (its imported text still matches the file).
    expect(plan.unchanged).toContain(file.questions[0].id);
    expect(plan.upstreamChanged).toEqual([
      expect.objectContaining({ seedKey: file.questions[1].id, staffEdited: false }),
    ]);
  });

  it("skips a new seed that duplicates an existing question's text", () => {
    const existing: ExistingQuestionRow[] = [
      {
        id: "member-q",
        seed_key: null,
        text: file.questions[5].text,
        normalized_text: normalizeQuestionText(file.questions[5].text),
        seed_imported_text: null,
        staff_edited: false,
      },
    ];
    const plan = planSeedImport(file, existing, topics);
    expect(plan.duplicateText).toEqual([{ seedKey: file.questions[5].id, existingQuestionId: "member-q" }]);
    expect(plan.insert.length).toBe(59);
  });
});
