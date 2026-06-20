# Six-Month Guided Rhythm: Content Management Guide

## Overview

The Six-Month Guided Rhythm is a post-onboarding system that guides members through 6 months of themes, weekly prompts, private reflections, and community invitations. Members cycle through this rhythm continuously.

All content is centralized in one file for easy editing by Trevor or other content managers.

## Timeline

- **Month 1**: Finding Your Rhythm
- **Month 2**: Touch, Affection, and the Body
- **Month 3**: Desire, Sexuality, and Shame-Free Honesty
- **Month 4**: Relationships, Repair, and Emotional Courage
- **Month 5**: Spirituality, Meaning, and Integration
- **Month 6**: Belonging, Practice, and What Comes Next

The rhythm cycles every 6 months. When Month 6 ends, the cycle begins again with Month 1.

## Admin Alert

You will receive an alert on the **Admin Dashboard** when **Month 5 begins** (with a 2-week advance notice).

This gives you time to prepare new content for the next 6-month cycle before Month 5 starts.

## How to Update Content

### 1. Located File

All rhythm content lives in one place:

```
lib/content/guided-rhythm.ts
```

No other files need to be edited for content changes.

### 2. Content Structure

Each month contains:

```typescript
{
  monthNumber: 1,
  title: "Finding Your Rhythm",
  monthlyTheme: "...",                    // 2-3 sentences on the month's focus
  monthlyReflection: "...",               // One reflection question for the month
  trevorNote: "...",                      // Personal note from Trevor (2-3 paragraphs)
  ritual: {
    title: "Choose Your Rhythm",
    description: "...",                   // How to approach the ritual
    options: ["...", "...", "..."]       // 3-5 options to choose from
  },
  weeks: [
    {
      weekNumber: 1,
      title: "Small Honesty",
      dashboardPrompt: "...",              // Shown on home dashboard
      privateReflection: "...",            // Prompt for private journaling
      communityInvitation: "...",          // Invitation to share in The Commons
      pairingPrompt: "..."                 // Prompt for pairing conversations
    },
    // ... weeks 2, 3, 4
  ],
  integration: {
    prompt: "...",                         // Month-end reflection prompt
    suggestedNextStep: "..."               // Where to go after this month
  }
}
```

### 3. Key Principles for Writing Content

#### Tone
- Warm, curious, human
- No pressure, no gamification
- Invitational, not demanding
- Respectful of pace and choice

#### Language to Use
- "Explore"
- "Notice"
- "Reflect"
- "Practice"
- "Invitation"
- "Rhythm"
- "Integration"
- "Return"

#### Language to Avoid
- "Complete" (sounds like homework)
- "Challenge" (sounds gamified)
- "Unlock" (gamification)
- "Streak" (pressure)
- "Achievement" (gamification)
- "You fell behind" (guilt)
- "Master" (unrealistic)

#### Content Structure Tips
- **Monthly Theme** (2-3 sentences): What is the big picture this month?
- **Trevor Note** (2-3 paragraphs): Personal guidance from Trevor. Warm, contextual, real.
- **Weekly Prompts** (4 per month):
  - **Dashboard Prompt**: Inviting, not prescriptive. Example: "What is one small truth..." (not "Tell us exactly...")
  - **Private Reflection**: Slightly deeper, more personal
  - **Community Invitation**: Warm invitation to share, emphasizes optional participation
  - **Pairing Prompt**: Suitable for one-on-one conversations, might be similar to community invitation
- **Month Integration**: Reflective, synthesis-oriented
- **Suggested Next Step**: Actionable but optional

### 4. Editing Steps

1. Open `lib/content/guided-rhythm.ts`
2. Locate the month(s) you want to edit
3. Update the text for any section
4. Save the file
5. The changes will appear on the next page load (no build required in dev)

### 5. Adding New 6-Month Cycles

When you want to introduce entirely new themes for the next cycle:

1. You'll see an admin alert 2 weeks before Month 5 begins
2. Create a new version of the 6 months with updated themes and content
3. Replace the entire `guidedRhythm` array in the file
4. Keep the `pairingPromptBank` unless you want to update it too
5. Commit and deploy

### 6. Updating the Pairing Prompt Bank

The pairing prompt bank is a separate section at the bottom of the file:

```typescript
export const pairingPromptBank: PairingPromptBank[] = [
  {
    id: "pairing-1",
    prompt: "What kind of connection are you practicing this month?",
  },
  // ... more prompts
];
```

These 10 prompts rotate through and complement the weekly pairing prompts. Update if you want fresh conversation starters for pairings.

## Calendar System

The months cycle based on the **Gregorian calendar**:

- **Month 1**: January & July
- **Month 2**: February & August
- **Month 3**: March & September
- **Month 4**: April & October
- **Month 5**: May & November
- **Month 6**: June & December

All members experience the same month at the same time, creating a shared community rhythm.

## Testing Content Changes

1. Navigate to **My Journey** in the app
2. Scroll down to **"Your Guided Rhythm"** section
3. You'll see the current month's theme and this week's prompts
4. Refresh the page to see your edits (no rebuild needed)
5. Try clicking through:
   - Write a private reflection
   - Set a monthly intention
   - View the community invitation
   - See pairing prompt

## Localization and Variations

Currently, all content is in English. If you want to:

- **Add another language**: Create a parallel file (e.g., `lib/content/guided-rhythm-es.ts`) and update the import in the data layer
- **Create seasonal variations**: Keep the same structure but create seasonal versions that swap in/out
- **Add member-type variations**: You could create conditional logic, but keep it simple

## Migrating to a Content Management System (CMS)

The current system (flat file) works well for up to ~20 people maintaining content. If you want to scale:

1. Export the structure from `lib/content/guided-rhythm.ts`
2. Create a simple CMS table in Supabase
3. Update `lib/data/guided-rhythm.ts` to fetch from the database instead of the file
4. Build a simple content editor UI in the admin section

For now, the flat file approach is simpler and doesn't require database changes.

## Q&A

**Q: Can I change content mid-month?**
A: Yes. Changes appear on the next page load. Old reflections don't disappear; new content is shown going forward.

**Q: What if I want shorter/longer themes?**
A: You can reduce to 4 themes (2 months each) or expand to 12 (1 month each). Just update the structure and the calendar system will adapt.

**Q: Can members see future months' content?**
A: No. The app only shows the current month's content. If you want to preview, temporarily adjust the month calculation in `lib/data/guided-rhythm.ts`.

**Q: How do I test new content before deploying?**
A: Edit the file locally, test on localhost:3000, then commit and push when ready.

**Q: What if I want to keep old content for reference?**
A: Create a file like `lib/content/guided-rhythm-v1-archive.ts` and keep it in the repo.

## Support

If you have questions about:
- **Content writing**: Refer to "Key Principles" above
- **Technical updates**: Check `lib/data/guided-rhythm.ts` and the data layer
- **Component rendering**: Check `components/guided-rhythm/` files
- **Admin alerts**: Check `lib/utils/rhythm-schedule.ts`

---

**Last updated**: June 2026
**Maintained by**: Trevor James (content), Claude (technical)
