export interface DripEmailDef {
  // Stable identifier stored in drip_emails_sent.email_key — never rename
  // an existing key once live, or already-sent tracking for it is lost
  // and members could be re-sent that email.
  key: string;
  // Days after onboarding_completed_at this email should go out.
  days: number;
  subject: string;
  paragraphs: (firstName: string, appUrl: string) => string[];
}

export const DRIP_EMAILS: DripEmailDef[] = [
  {
    key: "day5",
    days: 5,
    subject: "A Small Invitation",
    paragraphs: (firstName) => [
      `Hello ${firstName},`,
      `I wanted to check in and see how you're settling into The Connection Room.`,
      `If you've been exploring quietly, you're not alone. Most people spend a little time getting the lay of the land before jumping into conversations. That's completely okay.`,
      `When you feel ready, I'd like to invite you to take one small step.`,
      `Write your first post.`,
      `It doesn't have to be profound. You don't need to have a breakthrough or tell your whole life story. It could be something as simple as:`,
      `• What brought you here.\n• Something you've been thinking about lately.\n• A reflection from one of the daily prompts.\n• A question you've never had a place to ask.\n• A moment of gratitude, challenge, or curiosity.`,
      `You'll probably discover something important: people here aren't looking for perfect words. They're looking for real ones.`,
      `You might also consider responding to someone else's post. Sometimes the most meaningful connection begins with, "I relate to that," or "Thank you for sharing."`,
      `One of the reasons I created The Connection Room is because so many spaces reward performance, certainty, and having the right answers. I wanted to build something different... a community where authenticity matters more than polish, and where listening is just as valuable as speaking.`,
      `Every conversation helps shape the culture we're creating together.`,
      `So if you've been waiting until you had something "good enough" to say, consider this your permission to let that go.`,
      `Just begin.`,
      `I'm grateful you're here, and I'm looking forward to hearing your voice when the time feels right.`,
    ],
  },
  // day14 and day30 pending copy.
];
