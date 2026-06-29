// Theme-specific explanations to help members understand what each theme means
export const themeExplanations: Record<string, string> = {
  "Receiving Without Defending": "Belonging without performing means you are valued simply for being who you are, not for what you accomplish or how you show up. You can be imperfect, ordinary, and still be wanted here.",
  "Letting Yourself Be Known": "To be seen as you are means dropping the curated version and letting people know the real you—your doubts, your desires, your mess. Real connection happens when you stop editing yourself.",
  "The Courage to Ask": "Asking for what you need is not weakness or burden. It's an act of trust that gives others the gift of knowing how to support you. Your needs matter.",
  "What Your Body Has Been Holding": "Your body carries memory and emotion that your mind hasn't yet processed. Tension, numbness, or sensation in your body often holds wisdom about what you really feel beneath the surface.",
  "Friendship Without Performance": "Real friendship is what happens when you stop trying to impress and start being honest. It's the freedom to show up tired, confused, or struggling and still feel welcomed.",
  "Desire Without Shame": "Your desire—for connection, pleasure, rest, growth—is not selfish. It's information about what makes you feel alive. Honoring your desire is how you honor yourself.",
  "Touch Without Obligation": "Touch as medicine means receiving affection, closeness, or presence not as transaction but as nourishment. Not something you earn, but something you're allowed to receive.",
  "Resting the Armor": "You don't have to be strong right now. The armor you've built—the independence, the control, the stoicism—can come off for a while. It's safe to be soft.",
  "The Difference Between Privacy and Hiding": "Privacy is a healthy boundary. Hiding is protection from connection. One keeps you safe; the other keeps you alone. There's a difference worth knowing.",
  "Making Room for Wanting": "Beneath what you think you should want is what you actually want. That desire—for rest, for touch, for recognition—is legitimate and worth listening to.",
  "Presence as a Practice": "Presence isn't about achieving something. It's about showing up fully to what's actually happening right now, even the small, ordinary moments.",
  "The Body as a Home": "Your body is not a machine to optimize or a problem to fix. It's a home—a place to inhabit, to listen to, to befriend. You belong in it.",
  "Listening Without Fixing": "Sometimes people don't need advice or solutions. They need to be truly heard—not judged, not interrupted, just received. Listening is a form of love.",
  "Permission to Feel": "Your feelings are not too big, too messy, or too much. They're not wrong or selfish. They're information, and they deserve space to exist.",
  "Slow Down. You're Safe Here.": "You can stop rushing. There's nowhere you need to be but here. This moment is safe enough to slow down into.",
  "Softness as Strength": "The deepest strength is gentleness—with yourself, with others. Softness allows flow instead of resistance. It's not weakness. It's wisdom.",
  "The Courage of Honesty": "Your truth matters, even if it's uncomfortable, even if your voice shakes. Speaking it is an act of courage that creates space for real connection.",
  "What It Means to Belong": "Belonging isn't about fitting in or being like everyone else. It's about being known—fully seen and still chosen. That's what real belonging feels like.",
  "Release What You've Been Protecting": "We protect ourselves from pain, but that protection often keeps us from living. What would be possible if you let some of those walls down?",
  "The Language Your Body Speaks": "Your body tells the truth before your mind catches up—through tension, warmth, openness, or shutdown. Learning its language is learning to trust yourself.",
};

export function getThemeExplanation(title: string): string {
  return themeExplanations[title] || "This theme invites you to notice something true about yourself today.";
}
