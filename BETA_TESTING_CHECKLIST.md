# Beta Testing Checklist for The Connection Room (Phase 1.1)

Use this checklist to verify all beta features work correctly before inviting beta testers.

## Prerequisites

- [ ] Supabase is set up (see SUPABASE_SETUP.md)
- [ ] Environment variables are added to Vercel
- [ ] App is running locally or deployed to Vercel

## Account Creation & Authentication

- [ ] Visit sign-in page and see email input field
- [ ] Enter a valid email address
- [ ] Receive magic link email
- [ ] Click magic link in email
- [ ] Successfully redirected to onboarding
- [ ] Close browser and revisit app
- [ ] App recognizes you're logged in (no sign-in page)

## Onboarding Flow

- [ ] Step 1: Welcome screen shows with "Let's Begin" button
- [ ] Step 2: Community Agreements display
- [ ] Checkbox works to acknowledge agreements
- [ ] Step 3: Member type selection (Individual, Partnered, Couple)
- [ ] Can select each option without error
- [ ] Step 4: Basic profile info (name, pronouns, location, age, etc.)
- [ ] All fields save correctly
- [ ] Step 5: Profile photo upload works
- [ ] Photo displays as avatar after upload
- [ ] Step 6: Interests - can select multiple interests
- [ ] Step 7: Pairing preferences appear (if applicable)
- [ ] Step 8: Couples profile fields appear (if selected Couple type)
- [ ] Can fill in couple info without error
- [ ] Step 9: First reflection/prompt response shows
- [ ] Can submit prompt response
- [ ] Step 10: Completion screen shows
- [ ] "Continue to Dashboard" button works

## Profile Persistence

- [ ] After onboarding, profile data appears on Home page
- [ ] Log out via Sign Out button
- [ ] Sign back in with same email
- [ ] All profile data persists (name, interests, member type, etc.)
- [ ] Profile photo still shows
- [ ] Verification: Data is in Supabase profiles table

## Spaces

- [ ] Home page shows available spaces
- [ ] Can click "Join Space" on a space
- [ ] After joining, space shows "Joined" badge
- [ ] Can leave a space
- [ ] After leaving, space shows "Join" button again
- [ ] Log out and back in
- [ ] Joined spaces still show as joined
- [ ] Verification: Data is in Supabase space_memberships table

## Posts & Prompt Responses

- [ ] Visit a space you've joined
- [ ] See existing demo posts (if seeded)
- [ ] Can create a new post in the space
- [ ] Post appears in feed
- [ ] Can comment on a post
- [ ] Comment appears under post
- [ ] Log out and back in
- [ ] Post and comment still visible
- [ ] Verification: Data is in Supabase posts and comments tables

## Reactions

- [ ] On a post, see gentle reaction buttons (I relate, Thoughtful, etc.)
- [ ] Click a reaction
- [ ] Reaction count increases
- [ ] Can click same reaction again to undo
- [ ] Can react to comments
- [ ] Log out and back in
- [ ] Reactions persist
- [ ] Verification: Data is in Supabase reactions table

## Couples Pathway (if applicable)

- [ ] During onboarding, select "Couple" as member type
- [ ] Couples profile section appears with partner fields
- [ ] Can fill in partner info (name, email, etc.)
- [ ] "Partner invite coming in Phase 2" message shows (if applicable)
- [ ] Partner info saves after completing onboarding
- [ ] Log out and back in
- [ ] Couples profile data persists
- [ ] Verification: Data is in Supabase couples_profiles table

## Reporting Concerns

- [ ] On a post or comment, see "Report" option
- [ ] Click report
- [ ] Reason dropdown shows reasons
- [ ] Can submit a report
- [ ] "Thanks for reporting" confirmation shows
- [ ] Verification: Report is in Supabase reports table

## Demo Mode Fallback

- [ ] Temporarily remove Supabase env variables from local .env
- [ ] Restart app
- [ ] Should see "Continue as Demo Member" button
- [ ] Demo mode still fully functional
- [ ] No errors or blank screen
- [ ] Restore env variables and app goes back to real sign-in

## Mobile Responsiveness

- [ ] Resize browser to mobile width (< 640px)
- [ ] All text is readable
- [ ] Buttons are tappable (large enough)
- [ ] Form fields are usable on mobile
- [ ] Navigation is accessible
- [ ] No horizontal scrolling needed

## Edge Cases

- [ ] Try signing in with invalid email (no @)
  - Should show error message
- [ ] Try an email with spaces
  - Should be handled gracefully
- [ ] Sign in, close tab, open new tab
  - Should still be logged in
- [ ] Sign in on two different browsers
  - Should be different sessions (expected behavior)
- [ ] Wait for magic link to expire (24 hours)
  - Should show "Link expired, request a new one"

## Performance

- [ ] Page loads in < 3 seconds on decent internet
- [ ] Signing up doesn't time out
- [ ] Onboarding steps load without delay
- [ ] Posts load quickly in spaces
- [ ] No console errors when navigating

## Accessibility

- [ ] Can navigate with keyboard only (Tab through form)
- [ ] All interactive elements are keyboard accessible
- [ ] Form labels are associated with inputs
- [ ] Images have alt text

## Sign Out & Re-Auth

- [ ] Sign out from any page
- [ ] Redirected to sign-in page
- [ ] Can sign back in immediately
- [ ] No stale session data persists

## Admin Features (Phase 1.1)

- [ ] If admin dashboard exists, can view user count
- [ ] Can see new members list
- [ ] Can see onboarding completion status
- [ ] Can see basic member type breakdown
- [ ] (More admin features may be demo/dev mode only)

## Known Limitations

Document any limitations before sending to beta testers:

- [ ] Admin dashboard is in demo mode only (document this)
- [ ] Pairings are demo mode only (document this)
- [ ] No real partner invitations yet (Phase 2)
- [ ] No messaging between members (by design for safety)
- [ ] No Stripe/payments (Phase 2)
- [ ] No email digests (Phase 2)

## Final Verification

- [ ] No TypeScript errors on build
- [ ] No console errors on page load
- [ ] No unhandled promise rejections
- [ ] All data types match schema
- [ ] RLS policies are working (users can't see others' private data)

## Ready for Beta

Once all items above are checked:

- [ ] Supabase is production-ready
- [ ] All critical features work end-to-end
- [ ] Graceful fallback to demo mode works
- [ ] Documentation is clear
- [ ] Email setup is tested
- [ ] You're ready to invite beta testers!

## Inviting Beta Testers

1. Send email with:
   - "Welcome to The Connection Room beta!"
   - Link to https://community.trevorjamesla.com
   - Instructions: "Sign in with your email and you'll receive a magic link. Click it to get started!"
   - Expected time: 5-10 minutes to complete onboarding
   - Request feedback form link

2. Monitor Supabase:
   - Check profiles table for new users
   - Check posts table to see engagement
   - Check reports table for any concerns

3. Collect feedback:
   - Ask testers to report bugs
   - Ask testers about experience
   - Track what works well vs. what needs work

## Feedback Loop

After beta testing:
- [ ] Collect all bug reports
- [ ] Prioritize issues
- [ ] Plan Phase 1.2 (bug fixes/polish)
- [ ] Plan Phase 2 (full features)
