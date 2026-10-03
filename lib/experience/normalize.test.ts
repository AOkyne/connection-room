import { describe, it, expect } from "vitest";
import { findSimilarQuestion, normalizeQuestionText, questionSimilarity } from "./normalize";

describe("question identity", () => {
  it("normalizes case, punctuation, quotes and spacing", () => {
    expect(normalizeQuestionText("  When someone asks how you are, what helps you say more than “fine”?  ")).toBe(
      normalizeQuestionText("when someone asks how you are what helps you say more than fine")
    );
  });

  it("flags close paraphrases but not different questions", () => {
    const existing = [
      { id: "a", text: "How do you let someone know you would appreciate a hug?" },
      { id: "b", text: "What helped you make friends after moving somewhere you knew nobody?" },
    ];
    expect(findSimilarQuestion("How can you let someone know you'd appreciate a hug?", existing)?.id).toBe("a");
    expect(findSimilarQuestion("What do you do when a friendship fades?", existing)).toBeNull();
    expect(questionSimilarity("", "anything")).toBe(0);
  });
});
