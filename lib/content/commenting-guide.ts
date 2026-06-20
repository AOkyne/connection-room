export interface CommentingGuide {
  title: string;
  tagline: string;
  helpfulResponses: string[];
  lessHelpfulResponses: string[];
  closingNote: string;
}

export const commentingGuide: CommentingGuide = {
  title: "Responding with care",
  tagline: "Try presence before advice.",
  helpfulResponses: [
    '"I relate to this."',
    '"Thank you for naming that."',
    '"This gave me something to think about."',
    '"I appreciate how honestly you said this."',
    '"What helped you notice this?"',
    '"Would you like reflection, or did you mostly want to be witnessed?"',
  ],
  lessHelpfulResponses: [
    "Unsolicited advice",
    "Diagnosing",
    "Fixing",
    "Flirting",
    "Preaching",
    "Turning someone else's share into your own story",
  ],
  closingNote:
    "The most powerful response is often simply: I see you. I hear you. Thank you for sharing.",
};

export const commentingGuideSummary = `Try presence before advice. The most supportive responses often sound like: "I relate to this," "Thank you for naming that," or "This gave me something to think about."`;

export const reactionHelperText =
  "A small reaction can be powerful. Use the reaction buttons to witness without needing to write.";
