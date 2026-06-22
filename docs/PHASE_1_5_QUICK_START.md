# Phase 1.5: Quick Start Guide

## What Just Got Built

You now have a complete "People in the Room" feature with:
- 24 diverse member profiles with face photos
- Member discovery and profile pages
- Photo requirement for community participation
- Privacy controls for member visibility
- Beautiful member displays on space cards

## Getting Started (5 Steps)

### Step 1: Seed Demo Members (2 min)

Run this command from the project root:

```bash
cd connection-room
NEXT_PUBLIC_SUPABASE_URL=your_url SUPABASE_SERVICE_ROLE_KEY=your_key node scripts/seed-demo-members.js
```

Replace with your actual Supabase credentials. Find them in:
- Project Settings → API
- Under "Your API credentials"

### Step 2: Integrate Components (10 min)

In your space pages or layout, add the member display components:

```tsx
import { PeopleInSpace } from "@/components/members/PeopleInSpace";
import { demoMembers } from "@/lib/seed/demo-members";
import { demoSpaceMemberships } from "@/lib/seed/demo-space-memberships";

// In your space detail component:
const memberIds = Object.keys(demoSpaceMemberships).filter(id => 
  demoSpaceMemberships[id].includes(spaceId)
);
const spaceMembers = demoMembers.filter(m => memberIds.includes(m.id));

return (
  <div>
    {/* ... other content ... */}
    <PeopleInSpace members={spaceMembers} spaceId={spaceId} />
  </div>
);
```

### Step 3: Add Photo Requirement (5 min)

In `app/app/layout.tsx`, add the photo requirement prompt:

```tsx
import { PhotoRequirementPrompt } from "@/components/PhotoRequirementPrompt";

export default function AppLayout({ children }) {
  const [profile] = useState<Profile | null>(null);
  // ... existing code ...

  return (
    <>
      {profile && <PhotoRequirementPrompt profile={profile} />}
      {children}
    </>
  );
}
```

### Step 4: Update Space Cards (5 min)

Add member avatars to space cards:

```tsx
import { SpaceMemberAvatars } from "@/components/members/SpaceMemberAvatars";

// In your space card component:
<SpaceMemberAvatars members={spaceMembers} spaceId={space.id} maxVisible={5} />
```

### Step 5: Apply RLS Policies (10 min)

1. Go to your Supabase Project
2. Open SQL Editor
3. Copy policies from `docs/RLS_POLICIES.md`
4. Run each policy SQL statement
5. Verify they appear in Authentication > Policies

## Test It

1. **Onboarding**: Go through onboarding, verify photo is required
2. **Member Discovery**: View space members at `/app/spaces/[id]/members`
3. **Profiles**: Click a member to see their full profile
4. **Photos**: Verify all demo members have photos
5. **Privacy**: Edit profile to test visibility settings

## Key Files to Know

- **Member Profiles**: `lib/seed/demo-members.ts`
- **Member Components**: `components/members/*.tsx`
- **Member Pages**: `app/members/[id]/page.tsx`, `app/app/spaces/[id]/members/page.tsx`
- **Security**: `docs/RLS_POLICIES.md`
- **Full Guide**: `docs/PHASE_1_5_IMPLEMENTATION.md`

## Common Questions

**Q: Can I customize the demo members?**
A: Yes! Edit `lib/seed/demo-members.ts` directly. Change names, descriptions, interests, space assignments - whatever you want.

**Q: How do I replace the SVG avatars with real photos?**
A: Generate or source photos and replace the files in `public/demo-members/`. Update the `profilePhoto` URLs in `demo-members.ts` to point to your images.

**Q: Do real members need photos?**
A: Yes! The onboarding requires photo confirmation. Existing members see a prompt to add one.

**Q: What about privacy?**
A: Members can control who sees their profile and what information is visible. All privacy settings are in `ProfileVisibilitySettings` component.

**Q: Can couples show photos side-by-side?**
A: Yes! The CoupleProfile interface now has `partner2PhotoUrl`. Render both photos together.

## What's Different in Onboarding

1. **Photo Step**: Now requires both upload AND confirmation checkbox
2. **Profile Tagline**: New optional field "A short phrase that captures who you are"
3. **Photo Confirmation**: Users must confirm the photo is current and recognizable

## Important Notes

- All demo members are marked `is_demo_profile: true`
- Demo members cannot log in
- Demo members appear with "Sample member" badge
- Demo members are visible only to members in shared spaces (default)
- Remove demo members before production launch using the admin tools (Phase 2)

## Troubleshooting

**Members not appearing?**
- Did you run the seed script?
- Check Supabase profiles table for 24 demo records
- Verify space_members table has ~66 entries

**Photos not loading?**
- Check browser console for 404 errors
- Verify SVG files exist in `public/demo-members/`
- Check profilePhoto URLs in demo-members.ts

**RLS blocking access?**
- Make sure you're logged in
- Check that user is in shared space
- Verify RLS policy is applied correctly

**Profile page 404?**
- Check member ID format (should start with "demo-")
- Verify member exists in demoMembers array
- Check route matches: `/members/[id]`

## Next Steps

1. Customize demo member details
2. Test all functionality
3. Gather feedback from users
4. Plan Phase 1.6+ features
5. Prepare admin tools for member management

## Support

For detailed implementation guide, see: `docs/PHASE_1_5_IMPLEMENTATION.md`
For security policies, see: `docs/RLS_POLICIES.md`
