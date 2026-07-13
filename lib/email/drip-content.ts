export interface DripEmailDef {
  // Stable identifier stored in drip_emails_sent.email_key — never rename
  // an existing key once live, or already-sent tracking for it is lost
  // and members could be re-sent that email.
  key: string;
  // Days after onboarding_completed_at this email should go out.
  days: number;
  subject: string;
  paragraphs: (firstName: string, appUrl: string) => string[];
  // Defaults to "Warm hugs," in the shared template if omitted.
  signOff?: string;
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
  {
    key: "day14",
    days: 14,
    subject: "The Connection Room works best as a practice",
    paragraphs: (firstName) => [
      `Hello ${firstName},`,
      `By now you've had a chance to spend a little time in The Connection Room, and I wanted to share something I've noticed.`,
      `The members who get the most from this community aren't necessarily the ones who post every day or write the longest reflections.`,
      `They're the ones who return.`,
      `Not because they have to, but because they've made connection part of their rhythm.`,
      `Some days that might mean reading the Daily Reflection with your morning coffee. Other days it might be responding to someone's post, sharing something that's been on your mind, joining an event, or simply checking in to see what conversations are unfolding.`,
      `There isn't a right way to be here.`,
      `Some weeks you'll have a lot to say. Other weeks you'll simply witness. Both are valuable. Communities need listeners just as much as they need storytellers.`,
      `My hope is that The Connection Room becomes more than another app on your phone. I hope it becomes a place you return to when you want to feel a little more grounded, a little more understood, or a little less alone.`,
      `If you haven't already, here are a few things to explore:`,
      `• Visit a few different Rooms and find the conversations that speak to you.\n• Respond to one of the Daily Reflections.\n• Join an upcoming event or workshop.\n• Reach out with encouragement when someone's words resonate with you.\n• Revisit our Brand Philosophy and House Rules from time to time. They're the foundation of the culture we're building together.`,
      `Remember, this community will become whatever we create together.`,
      `Every thoughtful post.\nEvery honest question.\nEvery compassionate response.`,
      `They all matter.`,
      `Thank you for being part of this experiment in doing community differently. I'm grateful you're here, and I'm excited to see the relationships, conversations, and moments of growth that unfold over time.`,
      `See you in The Connection Room.`,
    ],
  },
  {
    key: "day30",
    days: 30,
    subject: "One month in... thank you for being here",
    signOff: "With gratitude,",
    paragraphs: () => [
      `It's hard to believe you've been part of The Connection Room for a month.`,
      `Whether you've posted often, commented occasionally, or mostly spent time reading and reflecting, thank you for being here.`,
      `Presence counts.`,
      `When I imagined this community, I wasn't trying to build another social platform filled with endless scrolling or pressure to always have something to say. I wanted to create a place where men could slow down, breathe, and remember what genuine connection feels like.`,
      `Every person who joins helps make that possible.`,
      `Over the past month, I hope you've found a conversation that made you think, a reflection that stayed with you, or a moment when you realized you weren't the only one carrying a particular question, fear, or longing.`,
      `If you haven't had that moment yet, don't worry. Community isn't something we consume. It's something we grow into.`,
      `As you continue your journey here, I encourage you to keep exploring.`,
      `Perhaps there's a Room you haven't visited yet. An event you've been meaning to attend. A reflection you've wanted to respond to. Or maybe there's someone whose post resonated with you, and today is the day you let them know.`,
      `Small moments of honesty have a way of creating meaningful relationships.`,
      `As one of our early members, you've also helped shape the culture of The Connection Room. Every thoughtful contribution, every act of encouragement, every respectful disagreement, every moment of vulnerability has helped define what this community is becoming.`,
      `For that, I'm deeply grateful.`,
      `I'd also love to hear from you.`,
      `What's working well? What could be better? Is there a feature, topic, or experience you'd love to see added? You can always share your ideas through the Bug Report & Feedback button in the bottom-right corner of your screen. Many of the improvements we're making are inspired directly by member feedback.`,
      `Finally, I want to leave you with this thought.`,
      `The goal isn't to become the most active member here.`,
      `The goal is to become a little more connected than you were yesterday.`,
      `To yourself.`,
      `To your body.`,
      `To your truth.`,
      `And to one another.`,
      `Thank you for trusting me—and this community—with a small part of your journey. I look forward to sharing many more conversations with you.`,
    ],
  },
];
