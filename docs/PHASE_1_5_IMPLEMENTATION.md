# Phase 1.5: People in the Room - Implementation Guide

## Overview

Phase 1.5 adds "People in the Room" - a comprehensive member presence feature showing visible member profiles with face photos, member discovery, and privacy controls.

## What's Been Implemented

### Phase A: Foundation
- ✅ Enhanced Profile interface with new fields:
  - `photo_confirmed`: boolean flag for photo confirmation
  - `photo_confirmed_at`: timestamp of photo confirmation
  - `profile_tagline`: short profile summary
  - `show_in_member_lists`: controls member list visibility
  - `profile_visibility`: enum for visibility levels
  - `show_general_location`, `show_recent_posts`: privacy toggles
  - `is_demo_profile`: flag for sample members
  - `partner2PhotoUrl`: for couple side-by-side photos

- ✅ CoupleProfile interface updated with `partner2PhotoUrl`

- ✅ 24 AI-generated face images (SVG avatars) in `public/demo-members/`
  - Diverse, realistic representations
  - Includes Marcus, Daniel, James, Alex, Chris, Jordan, David, Ryan, Sammy, Noah, Ethan, Liam, Mason, Lucas, Oliver, Aiden, Isaac, Michael, William, Benjamin, Jacob, Henry, Tyler, Gabriel

- ✅ Seed data structure in `lib/seed/demo-members.ts`
  - 24 comprehensive member profiles
  - Natural, authentic taglines and descriptions
  - Varied backgrounds, ages, relationship statuses

- ✅ Space membership assignments in `lib/seed/demo-space-memberships.ts`
  - Each member assigned to 2-4 relevant spaces
  - Distribution across all 10 spaces
  - 6-10 visible members per space

### Phase B: Onboarding & Profile Updates
- ✅ Mandatory photo upload in onboarding
  - Photo step now requires `profilePhoto` AND `photo_confirmed`
  - Confirmation checkbox: "I confirm this is a current, recognizable photograph..."
  - Cannot complete onboarding without both

- ✅ Photo confirmation checkbox added
  - Captures `photo_confirmed: true` and `photo_confirmed_at: Date`
  - Prevents progression without explicit confirmation

- ✅ Profile tagline field added to onboarding
  - Optional field in basics step
  - Placeholder: "A short phrase that captures who you are"

- ✅ PhotoRequirementPrompt component
  - Modal for existing members without photos
  - Warm, encouraging tone
  - Allows dismissal but shows note about restrictions
  - Integrated into app layout (ready for implementation)

### Phase C: Member Display Components
- ✅ `SpaceMemberAvatars` component
  - Shows 4-5 overlapping circular member photos
  - Configurable size (sm/md/lg)
  - Links to member profiles
  - Shows +N remaining members indicator
  - Perfect for space cards

- ✅ `PeopleInSpace` component
  - Grid of 6-10 members with photos, names, pronouns, taglines
  - "See all members" link
  - Responsive 2-3 column layout
  - Hover effects and smooth transitions

- ✅ `DemoProfileBadge` component
  - Marks sample members clearly
  - "Sample member" badge
  - Available in sm/md sizes

- ✅ `ProfileVisibilitySettings` component
  - Modal dialog with privacy controls
  - Toggle member list visibility
  - Set profile visibility level
  - Toggle location and post visibility
  - Save settings to profile

- ✅ Space member directory page: `/app/spaces/[id]/members/page.tsx`
  - Full responsive grid of all space members
  - Each card shows: photo, name, pronouns, location, tagline, interests
  - "Sample member" badge for demo profiles
  - "View Profile" button
  - Shows member count

- ✅ Member profile page: `/members/[id]/page.tsx`
  - Large profile photo
  - Display name, pronouns
  - Profile tagline (quoted)
  - Location, age, relationship status
  - "What brought them here" section
  - "What they're looking for" section
  - Interests grid
  - Spaces they've joined with links
  - Pairing profile result
  - Shared spaces indicator

### Phase D: Seed Data & Testing
- ✅ Created 24 demo members with consistent identities
  - Each has unique personality and story
  - Varied orientations, ages, relationship structures
  - Real, vulnerable language (not polished testimonials)
  - Focused on gay male community

- ✅ Distributed across all 10 spaces
  - The Commons (all members)
  - Start Here (all members)
  - Plus specialized spaces (Touch, Intimacy, Spirituality, Dating, Couples, Embodiment, Workshops, Masculinity)

- ✅ Seed script: `scripts/seed-demo-members.js`
  - Populates Supabase profiles and space_members tables
  - Handles upserts for idempotency
  - Provides membership summary
  - Ready to run with environment variables

### Phase E: Privacy & Access Control
- ✅ Profile visibility settings
  - `space_members`: visible only to members in shared spaces
  - `all_authenticated_members`: visible to all logged-in users
  - `limited`: shows only name and photo
  - `show_in_member_lists`: toggle for member directory inclusion
  - `show_general_location`: control location visibility
  - `show_recent_posts`: control post visibility

- ✅ RLS (Row Level Security) policies documentation
  - `RLS_POLICIES.md` with complete SQL policies
  - Profile view access by space membership and visibility
  - Profile update access (users edit own only)
  - Demo profile protection (readonly, cannot be deleted)
  - Space members view access
  - Testing and implementation steps included

## Files Created

### Components
- `components/PhotoRequirementPrompt.tsx` - Modal for existing members without photos
- `components/members/SpaceMemberAvatars.tsx` - Overlapping avatar stack
- `components/members/PeopleInSpace.tsx` - Member grid section
- `components/members/DemoProfileBadge.tsx` - Sample member indicator
- `components/members/ProfileVisibilitySettings.tsx` - Privacy controls

### Pages
- `app/app/spaces/[id]/members/page.tsx` - Space member directory
- `app/members/[id]/page.tsx` - Member profile page

### Seed Data
- `lib/seed/demo-members.ts` - 24 member profiles
- `lib/seed/demo-space-memberships.ts` - Space assignments
- `scripts/seed-demo-members.js` - Supabase seeding script
- `scripts/generate-demo-faces.js` - Face image generation

### Documentation
- `docs/RLS_POLICIES.md` - Security policies
- `docs/PHASE_1_5_IMPLEMENTATION.md` - This file

### Profile Updates
- `lib/data/profiles.ts` - Enhanced Profile and CoupleProfile interfaces
- `app/onboarding/page.tsx` - Updated with photo confirmation and tagline

### Assets
- `public/demo-members/*.svg` - 24 diverse avatar images

## Integration Checklist

### Before Launch

- [ ] **Review RLS Policies**
  - [ ] Read `docs/RLS_POLICIES.md`
  - [ ] Test each policy in Supabase
  - [ ] Verify authenticated access works
  - [ ] Verify unauthenticated users see nothing
  - [ ] Confirm demo profile protection

- [ ] **Seed Data**
  - [ ] Set environment variables (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  - [ ] Run: `node scripts/seed-demo-members.js`
  - [ ] Verify 24 members in profiles table
  - [ ] Verify ~66 space memberships created
  - [ ] Check members distributed correctly

- [ ] **UI Integration**
  - [ ] Add `PhotoRequirementPrompt` to app layout
  - [ ] Import in: `app/app/layout.tsx`
  - [ ] Test photo requirement flow
  - [ ] Verify onboarding photo step works

- [ ] **Space Cards**
  - [ ] Integrate `SpaceMemberAvatars` into space cards
  - [ ] Test overlapping avatars display correctly
  - [ ] Click avatars to view profiles

- [ ] **Space Pages**
  - [ ] Add `PeopleInSpace` component to space detail pages
  - [ ] Position before or after prompts
  - [ ] Test responsive grid layout

- [ ] **Member Links**
  - [ ] Verify all member profile links work
  - [ ] Test navigation from avatars
  - [ ] Test navigation from member names

- [ ] **Privacy Settings**
  - [ ] Add settings UI to profile/account page
  - [ ] Test visibility level changes
  - [ ] Verify profile becomes hidden when set to limited
  - [ ] Test removal from member lists

- [ ] **Couple Features**
  - [ ] Implement `partner2PhotoUrl` handling
  - [ ] Show couple photos side-by-side
  - [ ] Test couple profile updates

### Testing Plan

1. **Onboarding**
   - [ ] Try to complete without photo → blocked
   - [ ] Try to complete without confirmation → blocked
   - [ ] Complete with photo + confirmation → allowed
   - [ ] Verify `photo_confirmed_at` saved

2. **Member Discovery**
   - [ ] View space members page
   - [ ] Click member avatar
   - [ ] View full member profile
   - [ ] See shared spaces indicator
   - [ ] Check all fields display correctly

3. **Photo Requirement**
   - [ ] Existing member without photo → see prompt
   - [ ] Upload photo → prompt closes
   - [ ] Try to post without photo → blocked
   - [ ] Try to react without photo → blocked
   - [ ] Add photo → restrictions lifted

4. **Privacy Controls**
   - [ ] Set profile to "limited" → see limited profile as other user
   - [ ] Hide from member lists → don't appear in space directory
   - [ ] Hide location → location not visible
   - [ ] Hide posts → recent posts don't show

5. **Demo Profiles**
   - [ ] All demo members have photos
   - [ ] All marked "Sample member"
   - [ ] Cannot log in with demo account
   - [ ] Demo members visible in spaces

6. **Mobile Responsiveness**
   - [ ] Member directory grid responsive
   - [ ] Profile page readable on mobile
   - [ ] Avatar stacks readable on small screens
   - [ ] Touch targets appropriate size

### Known Limitations

- Demo members currently use SVG avatars (not realistic photos)
  - For production: Use actual face images from images generation service
  - Consider: ThisPersonDoesNotExist.com, Generated Photos, etc.
  - Store in Supabase Storage, not public directory

- Demo profile seed script needs environment variables set
  - Requires `SUPABASE_SERVICE_ROLE_KEY` (server-side secret)
  - Must be run from secure environment

- RLS policies must be applied manually
  - No automated migration yet
  - Apply via Supabase SQL Editor

### Future Enhancements

- Block/hide members
- Profile view notifications
- Member search/filtering
- Advanced visibility controls
- Activity feeds
- Member recommendations
- Group/community features
- Photo albums
- Achievement badges

## Support Resources

- Supabase RLS Guide: https://supabase.com/docs/guides/auth/row-level-security
- NextJS Image Component: https://nextjs.org/docs/api-reference/next/image
- Privacy by Design: https://ico.org.uk/for-organisations/guide-to-data-protection/guide-to-the-general-data-protection-regulation-gdpr/accountability-and-governance/data-protection-by-design-and-default/
