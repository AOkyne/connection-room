-- Moves the 4 automated email templates (welcome, day5, day14, day30) into
-- the database so they can be edited from the admin dashboard without a
-- code deploy. Seeded with the exact copy already live in production.
--
-- Body format: blank line = new paragraph, single line break = line break
-- within a paragraph (used for bullet lists). Supported merge tags:
-- {{firstName}} and {{appUrl}}.
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  sign_off TEXT NOT NULL DEFAULT 'Warm hugs,',
  -- NULL means "send at signup" (welcome email); otherwise the drip cron
  -- job sends this many days after onboarding_completed_at.
  days_after_onboarding INTEGER,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO email_templates (key, subject, body, sign_off, days_after_onboarding) VALUES
('welcome', $s0$Welcome to The Connection Room!$s0$, $body0$Hello {{firstName}},

Welcome to The Connection Room. I'm so glad you're here.

You haven't joined just another online community. You've stepped into a space created for men who are looking for something many of us have been missing: genuine connection, meaningful conversation, and a place where we can show up more honestly, more fully, and more humanly.

The Connection Room was built on a simple belief: connection is a practice. It grows through presence, curiosity, vulnerability, compassion, and courage. You don't need to be your most confident, articulate, or "put together" self to belong here. You simply need to arrive as you are.

As you explore, I encourage you to participate. Introduce yourself. Respond to a reflection. Join a conversation that resonates with you. Ask a question. Offer encouragement to another member. Communities don't become meaningful because they exist... they become meaningful because the people in them choose to show up.

Before you dive in, please take a few moments to read through our Brand Philosophy ({{appUrl}}/philosophy) and House Rules ({{appUrl}}/house-rules). They set the tone for the kind of community we're building together. They're not a long list of restrictions, but a shared agreement about how we treat ourselves and one another. We value respect over judgment, curiosity over certainty, consent over assumption, and compassion over criticism. We assume good intentions, honor different lived experiences, and remember that every person here deserves to feel safe, seen, and welcome.

Because you're joining while the paint is still a little wet, you may occasionally come across something that doesn't work quite as expected. If you notice a bug or have an idea for improving the experience, I'd be grateful if you'd let me know using the Bug Report button in the bottom-right corner of your screen. Your feedback will help us make The Connection Room better for everyone.

Finally, be gentle with yourself. There is no right way to participate here. Some days you may have a lot to share. Other days you may simply want to read, reflect, and be present. Both are welcome. This isn't about performing or getting everything right. It's about practicing connection, one conversation at a time.

Thank you for becoming part of this community, especially as one of our early members. You're helping shape the culture that future members will experience, and I'm genuinely grateful you're here.

Welcome home.$body0$, $so0$Warm hugs,$so0$, NULL),
('day5', $s1$A Small Invitation$s1$, $body1$Hello {{firstName}},

I wanted to check in and see how you're settling into The Connection Room.

If you've been exploring quietly, you're not alone. Most people spend a little time getting the lay of the land before jumping into conversations. That's completely okay.

When you feel ready, I'd like to invite you to take one small step.

Write your first post.

It doesn't have to be profound. You don't need to have a breakthrough or tell your whole life story. It could be something as simple as:

• What brought you here.
• Something you've been thinking about lately.
• A reflection from one of the daily prompts.
• A question you've never had a place to ask.
• A moment of gratitude, challenge, or curiosity.

You'll probably discover something important: people here aren't looking for perfect words. They're looking for real ones.

You might also consider responding to someone else's post. Sometimes the most meaningful connection begins with, "I relate to that," or "Thank you for sharing."

One of the reasons I created The Connection Room is because so many spaces reward performance, certainty, and having the right answers. I wanted to build something different... a community where authenticity matters more than polish, and where listening is just as valuable as speaking.

Every conversation helps shape the culture we're creating together.

So if you've been waiting until you had something "good enough" to say, consider this your permission to let that go.

Just begin.

I'm grateful you're here, and I'm looking forward to hearing your voice when the time feels right.$body1$, $so1$Warm hugs,$so1$, 5),
('day14', $s2$The Connection Room works best as a practice$s2$, $body2$Hello {{firstName}},

By now you've had a chance to spend a little time in The Connection Room, and I wanted to share something I've noticed.

The members who get the most from this community aren't necessarily the ones who post every day or write the longest reflections.

They're the ones who return.

Not because they have to, but because they've made connection part of their rhythm.

Some days that might mean reading the Daily Reflection with your morning coffee. Other days it might be responding to someone's post, sharing something that's been on your mind, joining an event, or simply checking in to see what conversations are unfolding.

There isn't a right way to be here.

Some weeks you'll have a lot to say. Other weeks you'll simply witness. Both are valuable. Communities need listeners just as much as they need storytellers.

My hope is that The Connection Room becomes more than another app on your phone. I hope it becomes a place you return to when you want to feel a little more grounded, a little more understood, or a little less alone.

If you haven't already, here are a few things to explore:

• Visit a few different Rooms and find the conversations that speak to you.
• Respond to one of the Daily Reflections.
• Join an upcoming event or workshop.
• Reach out with encouragement when someone's words resonate with you.
• Revisit our Brand Philosophy and House Rules from time to time. They're the foundation of the culture we're building together.

Remember, this community will become whatever we create together.

Every thoughtful post.
Every honest question.
Every compassionate response.

They all matter.

Thank you for being part of this experiment in doing community differently. I'm grateful you're here, and I'm excited to see the relationships, conversations, and moments of growth that unfold over time.

See you in The Connection Room.$body2$, $so2$Warm hugs,$so2$, 14),
('day30', $s3$One month in... thank you for being here$s3$, $body3$It's hard to believe you've been part of The Connection Room for a month.

Whether you've posted often, commented occasionally, or mostly spent time reading and reflecting, thank you for being here.

Presence counts.

When I imagined this community, I wasn't trying to build another social platform filled with endless scrolling or pressure to always have something to say. I wanted to create a place where men could slow down, breathe, and remember what genuine connection feels like.

Every person who joins helps make that possible.

Over the past month, I hope you've found a conversation that made you think, a reflection that stayed with you, or a moment when you realized you weren't the only one carrying a particular question, fear, or longing.

If you haven't had that moment yet, don't worry. Community isn't something we consume. It's something we grow into.

As you continue your journey here, I encourage you to keep exploring.

Perhaps there's a Room you haven't visited yet. An event you've been meaning to attend. A reflection you've wanted to respond to. Or maybe there's someone whose post resonated with you, and today is the day you let them know.

Small moments of honesty have a way of creating meaningful relationships.

As one of our early members, you've also helped shape the culture of The Connection Room. Every thoughtful contribution, every act of encouragement, every respectful disagreement, every moment of vulnerability has helped define what this community is becoming.

For that, I'm deeply grateful.

I'd also love to hear from you.

What's working well? What could be better? Is there a feature, topic, or experience you'd love to see added? You can always share your ideas through the Bug Report & Feedback button in the bottom-right corner of your screen. Many of the improvements we're making are inspired directly by member feedback.

Finally, I want to leave you with this thought.

The goal isn't to become the most active member here.

The goal is to become a little more connected than you were yesterday.

To yourself.

To your body.

To your truth.

And to one another.

Thank you for trusting me—and this community—with a small part of your journey. I look forward to sharing many more conversations with you.$body3$, $so3$With gratitude,$so3$, 30)
ON CONFLICT (key) DO NOTHING;
