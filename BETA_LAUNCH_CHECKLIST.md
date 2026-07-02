# Connection Room - Beta Launch Checklist

**Last Updated:** July 1, 2026  
**Status:** In Progress  

---

## ✅ SECTION 1: CRITICAL FIXES (COMPLETED)

### Code Cleanup
- [x] Delete backup files
  - ✅ Deleted `app/app/page-backup-1782716964.tsx`
  - ✅ Deleted `app/app/page-v1.3.tsx`
  - ✅ Deleted `lib/seed/daily-companion-content.ts.backup`
  - ✅ Deleted `lib/supabase/schema-v1.3.sql`
  - ✅ Deleted `scripts/deploy-v1.3-schema.sql`

### Assets Cleanup
- [x] Remove unused public files
  - ✅ Deleted `next.svg`, `vercel.svg`, `file.svg`, `globe.svg`, `window.svg`
  - ✅ Deleted duplicate PNG logo (keeping only SVG)

### Configuration
- [x] Favicon setup
  - ✅ Verified `trevor-james-favicon.png` is properly configured in `app/layout.tsx`
  - ✅ Browser tab icon will display correctly

### Accessibility
- [x] Alt text audit
  - ✅ Landing page: All images have alt text
  - ✅ Auth pages: Both header logos have alt text
  - ✅ Onboarding: Trevor's photo has alt text
  - ⚠️ Remaining images mostly have alt text (lower priority pages)

---

## 🔄 SECTION 2: RESPONSIVE DESIGN TEST

### Landing Page
- **Mobile (375x812)**: ✅ Responsive, readable, logo prominent
- **Tablet (768x1024)**: ✅ Clean layout, proper spacing
- **Desktop**: ✅ Multicolumn layout working

### Key Elements Tested
- ✅ Hero section scales properly on all devices
- ✅ Logo size responsive and prominent
- ✅ CTA buttons visible and clickable
- ✅ Images load and display correctly
- ✅ Typography scales appropriately
- ✅ Color contrast maintained

### Authenticated App Pages (TO TEST)
- [ ] App home/dashboard (mobile, tablet, desktop)
- [ ] Profile page (mobile, tablet, desktop)
- [ ] Spaces/Commons (mobile, tablet, desktop)
- [ ] Connections page (mobile, tablet, desktop)
- [ ] Journey/Seven Doors (mobile, tablet, desktop)
- [ ] Mobile bottom navigation (verify all routes accessible)
- [ ] Desktop sidebar navigation (verify all routes accessible)

---

## 📋 SECTION 3: FEATURE AUDIT

### Landing Page & Public Pages
- [x] Landing page loads
- [x] Logo displays and links to home
- [x] CTA buttons link to auth/consultation
- [x] All sections render properly
- [x] Responsive on mobile/tablet/desktop
- [x] Trevor's personal message shows on onboarding completion

### Authentication Flow
- [ ] Email signup works
- [ ] Email signin works
- [ ] Password requirements enforced
- [ ] Admin login works with secret key
- [ ] Demo mode login works
- [ ] Check email page displays
- [ ] Error messages are clear and helpful
- [ ] Success messages confirm actions

### Onboarding Flow
- [ ] Welcome step displays
- [ ] Community agreements show with proper scrolling
- [ ] Member type selection works
- [ ] Profile basics collect data
- [ ] Photo upload works
- [ ] Interests selection functional
- [ ] Connection preferences save
- [ ] Final step shows Trevor's welcome message with photo
- [ ] "Where would you like to start?" buttons work

### Authenticated App - Core Features
- [ ] **Dashboard/Home**
  - [ ] Badges display correctly
  - [ ] Daily companion loads
  - [ ] Upcoming events show
  - [ ] Recent reflections appear
  - [ ] Space suggestions work

- [ ] **Spaces/Commons**
  - [ ] Posts display properly
  - [ ] Create post functionality works
  - [ ] Post templates available
  - [ ] Reactions work
  - [ ] Comments work
  - [ ] Search filters posts

- [ ] **Connections**
  - [ ] User suggestions display
  - [ ] Profile views work
  - [ ] Mutual interest matching shows
  - [ ] Connection requests functional

- [ ] **Journey (Seven Doors)**
  - [ ] All 7 doors display
  - [ ] Door progression works
  - [ ] Prompts load correctly
  - [ ] Reflection submission functional
  - [ ] Progress tracking shows

- [ ] **Profile**
  - [ ] Photo upload works
  - [ ] Edit fields save changes
  - [ ] Interests update properly
  - [ ] Preferences save correctly
  - [ ] Display name changes apply

- [ ] **Navigation**
  - [ ] Mobile: Bottom nav works on all pages
  - [ ] Desktop: Sidebar shows all routes
  - [ ] Links don't break on mobile
  - [ ] No missing navigation items

### Admin Panel
- [ ] Dashboard displays
- [ ] Daily companion editor works
- [ ] Can create/edit content
- [ ] Admin-only routes protected

---

## 🐛 SECTION 4: BUG REPORT TEMPLATE

### Instructions for Beta Testers

When reporting issues, please include:

```
## Bug Report

**Title:** [Clear, specific title]

**Severity:** 
- [ ] Critical (app breaking/data loss)
- [ ] High (feature not working)
- [ ] Medium (minor issue, workaround exists)
- [ ] Low (cosmetic/nice to have)

**Environment:**
- Device: [iPhone 12, iPad Pro, etc.]
- OS Version: [iOS 17, etc.]
- App Version: [current build]
- Network: [WiFi/Cellular]

**Steps to Reproduce:**
1. [First step]
2. [Second step]
3. [Expected result]
4. [Actual result]

**Screenshots:** [If applicable]

**Expected Behavior:** [What should happen]

**Actual Behavior:** [What's actually happening]

**Workaround:** [Any way to work around the issue, if applicable]

**Notes:** [Any additional context]
```

### Known Issues (Beta)
- [ ] None documented yet - to be filled as discovered

### Testing Focus Areas
- [ ] **Mobile experience**: Most testers will be on mobile
- [ ] **Form validation**: Ensure error messages are clear
- [ ] **Loading states**: Verify spinners/placeholders appear
- [ ] **Error handling**: Test what happens on network failure
- [ ] **Edge cases**: Test with unusual data/inputs
- [ ] **Performance**: Note any lag or slow sections

---

## 📊 DEPLOYMENT CHECKLIST

### Pre-Deployment
- [ ] All tests pass locally
- [ ] No console errors on any page
- [ ] No unhandled promise rejections
- [ ] All links functional
- [ ] All images load
- [ ] External links open correctly

### Deployment
- [ ] Code pushed to main branch
- [ ] Vercel deployment completes successfully
- [ ] Environment variables configured
- [ ] Database seeding successful
- [ ] Admin account created

### Post-Deployment
- [ ] Test landing page on beta domain
- [ ] Test auth flow on beta domain
- [ ] Test onboarding on beta domain
- [ ] Test at least one app feature
- [ ] Verify favicon shows in browser tab
- [ ] Check mobile responsiveness on real device
- [ ] Verify no console errors in DevTools

---

## 📝 SIGN-OFF

- [ ] Product: Approved for beta launch
- [ ] Engineering: Code reviewed and tested
- [ ] Design: Mobile/desktop/tablet verified
- [ ] Admin: Infrastructure ready

---

## Next Steps

1. **Complete responsive design testing** (Section 2)
2. **Run through feature checklist** (Section 3)
3. **Create beta tester instructions** with bug report template (Section 4)
4. **Deploy to beta environment**
5. **Monitor for first week issues**
6. **Gather and prioritize feedback**

