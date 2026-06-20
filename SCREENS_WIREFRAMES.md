# The Connection Room - Screens & Wireframes

## User Flow Map

```
Public Site (/) 
    ↓
Authentication (auth/) 
    ├─→ Sign Up → Onboarding → Home
    ├─→ Sign In → Home
    └─→ Try Demo → Home (demo user)
            ↓
        ──────────────────────────────────────
        │        AUTHENTICATED APP           │
        │  (Everything below requires login)  │
        ──────────────────────────────────────
            ↓
    Home (/app) - Main dashboard
        ├─→ Spaces (/app/spaces) - Browse & manage community spaces
        │   └─→ Space Detail (/app/spaces/[id]) - View posts & engage
        │       └─→ User Profile (/app/users/[userId]) - View user
        │
        ├─→ Quizzes (/app/quizzes) - Quiz selection
        │   └─→ Quiz Detail (/app/quizzes/[slug]) - Take quiz
        │
        ├─→ Events (/app/events) - View upcoming events
        │
        ├─→ My Journey (/app/journey) - Activity timeline
        │
        ├─→ Pairings (/app/pairings) - Connect with others
        │
        ├─→ Profile (/app/profile) - Edit your profile
        │
        └─→ Admin (/app/admin) - [Admin only]
            └─→ Events (/app/admin/events) - Manage events
```

---

## Screen Details

### 1. PUBLIC LANDING PAGE (/)

**Purpose:** Inform visitors about The Connection Room

**Layout:**
```
┌─────────────────────────────────────────┐
│  Header with Logo + Sign In              │
├─────────────────────────────────────────┤
│                                         │
│  Hero Section:                          │
│  "A Private Community for Honest        │
│   Connection"                           │
│                                         │
│  [Join as Demo Member] [Join as Admin]  │
│                                         │
├─────────────────────────────────────────┤
│  What You'll Explore (3-column grid)    │
│  • Embodiment                           │
│  • Connection                           │
│  • Integration                          │
├─────────────────────────────────────────┤
│  Community Values & Guidelines          │
├─────────────────────────────────────────┤
│  CTA: [Enter Community] [Free Consult]  │
├─────────────────────────────────────────┤
│  Footer with Links                      │
└─────────────────────────────────────────┘
```

**Key Elements:**
- Logo at top
- Value proposition
- Quick entry points
- Community guidelines summary
- External link to coaching

---

### 2. AUTHENTICATION PAGE (/auth)

**Purpose:** Sign up or sign in with email/password

**Two Modes:**
- Sign Up (create account)
- Sign In (existing user)

**Layout:**
```
┌─────────────────────────────────────────┐
│  Header with Logo                       │
├─────────────────────────────────────────┤
│                                         │
│  [Sign Up] [Sign In] Tab Selection     │
│                                         │
│  Email Address:                         │
│  [__________________________]           │
│                                         │
│  Password:                              │
│  [__________________________]           │
│                                         │
│  [Create Account / Sign In]             │
│                                         │
│  ─────────────── or ──────────────────  │
│                                         │
│  [Try Demo (No Login Required)]         │
│                                         │
├─────────────────────────────────────────┤
│  Welcome Message + Instructions         │
├─────────────────────────────────────────┤
│  [← Back to Home]                       │
└─────────────────────────────────────────┘
```

**Key Elements:**
- Tab switcher (Sign Up/Sign In)
- Email input
- Password input
- Primary action button
- Demo access button
- Back link

---

### 3. ONBOARDING PAGE (/onboarding)

**Purpose:** Complete user profile after signup

**Multi-Step Form:**
1. Basic Info (name, pronouns, location)
2. Interests & Preferences
3. Relationship Status
4. Profile Photo
5. "What brought you here?"

**Layout:**
```
┌─────────────────────────────────────────┐
│  Progress Bar: Step X of 5               │
├─────────────────────────────────────────┤
│                                         │
│  Section Title                          │
│  Description                            │
│                                         │
│  [Form Fields]                          │
│                                         │
│  [Back] [Next / Complete]               │
│                                         │
└─────────────────────────────────────────┘
```

---

### 4. HOME / DASHBOARD (/app)

**Purpose:** Main entry point after login

**Layout:** Grid-based dashboard
```
┌────────────────────────────────────┐
│  Welcome, [Name]!                  │
│  You're part of a community...     │
├────────────────────────────────────┤
│                                    │
│  [Featured Card - Full Width]      │
│  Keep Exploring / Recommended Step │
│                                    │
├────────────────────────────────────┤
│                                    │
│  Today's Reflection                │ Today's Reflection
│  ┌──────────────────┐              │ Card with:
│  │ "What kind of... │              │ • Prompt text
│  │ [Respond Button] │              │ • Guidance note
│  └──────────────────┘              │ • Respond button
│                                    │
├────────────────────────────────────┤
│  2-Column Grid:                    │
│                                    │
│  ┌────────────┐  ┌────────────┐    │
│  │ Suggested  │  │ Progress   │    │
│  │ Space      │  │ Tracker    │    │
│  └────────────┘  └────────────┘    │
│                                    │
│  ┌────────────┐  ┌────────────┐    │
│  │ Upcoming   │  │ Badges     │    │
│  │ Events     │  │ Earned     │    │
│  └────────────┘  └────────────┘    │
│                                    │
│  ┌────────────────────────────┐    │
│  │ Take A Quiz                │    │
│  │ Discover your patterns     │    │
│  └────────────────────────────┘    │
│                                    │
│  ┌────────────────────────────┐    │
│  │ For You (Personalized)     │    │
│  │ [Offer Card]               │    │
│  └────────────────────────────┘    │
│                                    │
│  ┌────────────────────────────┐    │
│  │ Quick Navigation           │    │
│  │ Spaces | Pairings | Journey│    │
│  └────────────────────────────┘    │
│                                    │
├────────────────────────────────────┤
│  Demo Mode Banner (if demo user)   │
│  You're exploring in demo mode...  │
└────────────────────────────────────┘
```

**Key Cards:**
1. **Today's Reflection** - Daily prompt with response button
2. **Suggested Space** - One random space to explore
3. **Progress Tracker** - Onboarding checklist
4. **Upcoming Events** - Next event with date/time
5. **Badges Earned** - Latest achievements
6. **Take A Quiz** - Link to quizzes
7. **For You** - Personalized offers
8. **Navigation** - Quick links to other sections

---

### 5. SPACES PAGE (/app/spaces)

**Purpose:** Browse and manage community spaces

**Layout:**
```
┌─────────────────────────────────────────┐
│  Community Spaces                       │
│  Choose spaces that resonate...         │
├─────────────────────────────────────────┤
│                                         │
│  Your Spaces (with drag-to-reorder)    │
│  Drag to reorder your spaces           │
│                                         │
│  ┌─────────────┐  ┌─────────────┐     │
│  │ ✓ Required  │  │ The Commons │     │
│  │ Start Here  │  │ Members: 247│     │
│  │ Description │  │ [Enter]     │     │
│  │ [Enter][X]  │  │ [Leave]     │     │
│  └─────────────┘  └─────────────┘     │
│                                         │
│  ┌─────────────┐  ┌─────────────┐     │
│  │ [Other      │  │ [Other      │     │
│  │  spaces]    │  │  spaces]    │     │
│  └─────────────┘  └─────────────┘     │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  Explore More Spaces                    │
│                                         │
│  ┌─────────────┐  ┌─────────────┐     │
│  │ [Available  │  │ [Available  │     │
│  │  space]     │  │  space]     │     │
│  │ [Join]      │  │ [Join]      │     │
│  └─────────────┘  └─────────────┘     │
│                                         │
└─────────────────────────────────────────┘
```

**Key Features:**
- Drag-to-reorder your spaces
- Required spaces marked with ✓
- Enter/Leave buttons per space
- Available spaces below
- Space icon + name + member count

---

### 6. SPACE DETAIL PAGE (/app/spaces/[id])

**Purpose:** View and engage in a specific community space

**Layout:**
```
┌─────────────────────────────────────────┐
│  Space Icon  Space Name                 │
│  Description of the space...            │
├─────────────────────────────────────────┤
│                                         │
│  [If Start Here Space]                  │
│  How To Begin Checklist                 │
│  Progress: 40%                          │
│  ✓ Complete Profile                     │
│  ○ Explore Other Spaces (2 left)        │
│  ○ Make Your First Post                 │
│  ○ Take a Quiz                          │
│  ○ Respond to Daily Prompt              │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  Share Your Thoughts                    │
│  [Text area for new post...]            │
│  [Post Button]                          │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  Posts Feed (Most Recent First)         │
│                                         │
│  Post Card:                             │
│  ┌─────────────────────────────────┐    │
│  │ [Photo] Name (Pronouns)         │    │
│  │ Posted X hours ago              │    │
│  │                                 │    │
│  │ Post content text...            │    │
│  │                                 │    │
│  │ ♥️ 3  💬 2  ✨ 1                 │    │
│  │ [View Comments] [React]         │    │
│  │                                 │    │
│  │  [Expanded View - Comments]     │    │
│  │  ┌───────────────────────────┐  │    │
│  │  │ [Photo] Name              │  │    │
│  │  │ Comment text...           │  │    │
│  │  │ ♥️ 1                       │  │    │
│  │  └───────────────────────────┘  │    │
│  │                                 │    │
│  │  [Add Comment]                  │    │
│  │  [Text area...]                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  [More Posts...]                        │
│                                         │
└─────────────────────────────────────────┘
```

**Key Elements:**
- Space header with icon and description
- Onboarding checklist (if Start Here)
- Create post form
- Posts feed
- Expandable comments per post
- Reaction buttons (hearts, etc.)

---

### 7. USER PROFILE PAGE (/app/users/[userId])

**Purpose:** View another user's public profile

**Layout:**
```
┌─────────────────────────────────────────┐
│  [Avatar] Display Name                  │
│  Pronouns  •  Location                  │
├─────────────────────────────────────────┤
│                                         │
│  What Brought Them Here                 │
│  "I'm interested in deepening..."       │
│                                         │
│  Interests:                             │
│  [Tag1] [Tag2] [Tag3]                   │
│                                         │
│  Pairing Comfort Level:                 │
│  ✓ Open to connection                   │
│                                         │
│  Member Since:                          │
│  March 15, 2026                         │
│                                         │
└─────────────────────────────────────────┘
```

---

### 8. QUIZZES HUB PAGE (/app/quizzes)

**Purpose:** Browse and start available quizzes

**Layout:**
```
┌─────────────────────────────────────────┐
│  Take A Quiz                            │
│  Discover your intimacy patterns        │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────────────────────────┐   │
│  │ 🎯                               │   │
│  │ What's Your Intimacy Pattern?    │   │
│  │                                  │   │
│  │ Learn about your attachment and  │   │
│  │ desire patterns in relationships │   │
│  │                                  │   │
│  │ [Start Quiz →]                   │   │
│  └──────────────────────────────────┘   │
│                                         │
│  ┌──────────────────────────────────┐   │
│  │ 💔                               │   │
│  │ The Erotic Relationship          │   │
│  │ Evaluator                        │   │
│  │                                  │   │
│  │ Evaluate your relationship's     │   │
│  │ emotional & physical dynamics    │   │
│  │                                  │   │
│  │ [Start Quiz →]                   │   │
│  └──────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

**Quiz Detail Page:**
- Full-screen quiz embedded via ScoreApp
- Title at top
- Embedded quiz widget (interactive)
- Back button

---

### 9. EVENTS PAGE (/app/events)

**Purpose:** View and RSVP to upcoming events

**Layout:**
```
┌─────────────────────────────────────────┐
│  Upcoming Events & Workshops            │
├─────────────────────────────────────────┤
│                                         │
│  Event Card:                            │
│  ┌──────────────────────────────────┐   │
│  │ Monthly Connection Circle        │   │
│  │ 📅 Mar 30, 2026  🕐 7:00 PM PT   │   │
│  │ 💻 Virtual                       │   │
│  │ Facilitator: Trevor James        │   │
│  │                                  │   │
│  │ A gentle guided circle for       │   │
│  │ authentic sharing and connection │   │
│  │                                  │   │
│  │ 👥 24 interested                 │   │
│  │ [Mark Interested]                │   │
│  └──────────────────────────────────┘   │
│                                         │
│  [More events...]                       │
│                                         │
└─────────────────────────────────────────┘
```

---

### 10. ADMIN EVENTS PAGE (/app/admin/events)

**Purpose:** Create and manage events

**Layout:**
```
┌──────────────────────────────────────────┐
│  Manage Events                           │
├──────────────────────────────────────────┤
│  [+ Add New Event]                       │
│                                          │
│  Event Management Form:                  │
│  ┌──────────────────────────────────┐    │
│  │ Event Title *                    │    │
│  │ [__________________________]     │    │
│  │                                  │    │
│  │ Description                      │    │
│  │ [Multi-line text area...]        │    │
│  │                                  │    │
│  │ Date *  [____/____/____]         │    │
│  │ Time *  [__ : __ AM/PM]          │    │
│  │                                  │    │
│  │ Format:                          │    │
│  │ (o) Virtual  (o) In-Person       │    │
│  │                                  │    │
│  │ Location: [______________]       │    │
│  │ Facilitator: [______________]    │    │
│  │ Attendee Count: [___]            │    │
│  │                                  │    │
│  │ [Cancel] [Create Event]          │    │
│  └──────────────────────────────────┘    │
│                                          │
├──────────────────────────────────────────┤
│                                          │
│  Existing Events:                        │
│  ┌──────────────────────────────────┐    │
│  │ Monthly Connection Circle        │    │
│  │ Mar 30, 2026 • 7:00 PM PT        │    │
│  │ 24 interested                    │    │
│  │ [Edit] [Delete]                  │    │
│  └──────────────────────────────────┘    │
│                                          │
└──────────────────────────────────────────┘
```

---

### 11. PROFILE EDIT PAGE (/app/profile)

**Purpose:** Update user profile information

**Layout:**
```
┌─────────────────────────────────────────┐
│  Edit Your Profile                      │
├─────────────────────────────────────────┤
│                                         │
│  Display Name:                          │
│  [__________________________]           │
│                                         │
│  Pronouns:                              │
│  [__________________________]           │
│                                         │
│  Location:                              │
│  [__________________________]           │
│                                         │
│  What Brought You Here:                 │
│  [Large text area...]                   │
│                                         │
│  Interests (Select all that apply):     │
│  ☐ Embodiment  ☐ Communication         │
│  ☐ Sexuality   ☐ Coaching Support      │
│  ☐ Workshops   ☐ Coaching              │
│                                         │
│  [Save Changes] [Cancel]                │
│                                         │
└─────────────────────────────────────────┘
```

---

## Response to Daily Prompt Modal

**Purpose:** Quick response form for daily reflection prompt

**Layout:**
```
┌────────────────────────────────────┐
│  Respond to Prompt          [X]    │
├────────────────────────────────────┤
│                                    │
│  "What kind of connection         │
│   would feel good today?"          │
│                                    │
│  Your Response:                    │
│  [Large text area for input...]    │
│                                    │
│  Share in Space:                   │
│  [Dropdown: The Commons ▼]         │
│                                    │
│  [Cancel] [Post Response]          │
│                                    │
└────────────────────────────────────┘
```

---

## Navigation Structure

**Authenticated App Navigation:**

**Desktop (Left Sidebar):**
- Home
- Spaces
- My Journey
- Pairings
- Events
- Profile
- [Admin Dashboard] (admin only)

**Mobile (Bottom Navigation):**
- Home
- Spaces
- My Journey
- Pairings
- Events
- Profile

---

## Design System

**Colors:**
- Primary: #d4a574 (tan/gold)
- Secondary: #9d7f5c (brown)
- Accent: #8fa878 (sage green)
- Text: #2a2318 (dark)
- Text Secondary: #6b5f52 (medium)
- Background: #fdfbf7 (off-white)
- Surface: #f3ede5 (light)

**Typography:**
- Headings: Georgia serif (non-system)
- Body: Inter/system sans-serif

**Components:**
- Cards with shadow and border
- Buttons (primary, secondary, outline, ghost)
- Modal dialogs with backdrop
- Grid layouts (responsive 1-3 columns)
- Form inputs with focus states

---

## Responsive Breakpoints

- **Mobile:** < 768px (1 column)
- **Tablet:** 768px–1024px (2 columns)
- **Desktop:** > 1024px (3 columns)

All layouts adapt gracefully to device size.
