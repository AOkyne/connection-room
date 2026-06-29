// Theme-specific explanations to help members understand each theme
export const themeExplanations: Record<string, string> = {
  "Receiving Without Defending": "Notice what happens when you let good things come to you without having to earn them. What defenses drop away when you simply receive?",
  "Letting Yourself Be Known": "What would it feel like to be seen as you actually are? Not the version you think people want, but the real you.",
  "The Courage to Ask": "Asking for what you need is not burden. It's an invitation for connection.",
  "What Your Body Has Been Holding": "Your body remembers what your mind forgets. What has it been trying to tell you?",
  "Friendship Without Performance": "Real friendship is what happens when you stop trying to be impressive.",
  "Desire Without Shame": "Your desire is not selfish. It's information about what you need to feel alive.",
  "Touch Without Obligation": "What would change if touch was something you could receive just for the pleasure of it?",
  "Resting the Armor": "You don't have to be strong right now. It's safe to rest.",
  "The Difference Between Privacy and Hiding": "There's a difference between protecting your peace and protecting yourself from connection.",
  "Making Room for Wanting": "What do you actually want, beneath what you think you should want?",
  "Presence as a Practice": "Show up fully, even for the small moments.",
  "The Body as a Home": "Your body is not a problem to be fixed. It's a home to inhabit.",
  "Listening Without Fixing": "Sometimes people don't need solutions. They need to be heard.",
  "Permission to Feel": "Your feelings are not too much. They're not wrong. They just are.",
  "Slow Down. You're Safe Here.": "You can breathe. There's no rush.",
  "Softness as Strength": "The most powerful thing you can do is be gentle with yourself and others.",
  "The Courage of Honesty": "Your truth is worth speaking, even if your voice shakes.",
  "What It Means to Belong": "Belonging isn't about fitting in. It's about being known.",
  "Release What You've Been Protecting": "What are you holding so tight that it's keeping you from living?",
  "The Language Your Body Speaks": "Your body speaks truth before your mind catches up. Can you hear it?",
};

export function getThemeExplanation(title: string): string {
  return themeExplanations[title] || "Notice what this theme brings up for you today.";
}
