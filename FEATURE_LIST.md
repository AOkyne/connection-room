# The Connection Room - Feature List

## Privacy & Security

- **Private profile fields** (orientation, relationship status, connection
  comfort/boundaries, quiz results, onboarding responses) are visible only
  to the profile owner and admins.
- **Public member profile** (display name, photo, tagline, pronouns,
  general location, interests) is a separate table with its own
  per-field visibility toggles and row-level visibility states
  (hidden / members-only / shared-spaces / discovery).
- **Server-side connection matching** — private fields used for match
  scoring never reach the browser; only safe match results do.
- See [`PRIVACY_SECURITY_MODEL.md`](PRIVACY_SECURITY_MODEL.md) for full detail.

## Core Features

### Authentication & Onboarding
- **Email/Password Authentication** - Secure signup and signin with Supabase
- **Profile Creation** - Users set up display name, pronouns, location, interests, relationship type
- **Guided Onboarding** - Multi-step setup process for new members
- **Demo Access** - Instant "Try Demo" button for visitors without login

### Community Spaces
- **11+ Spaces** - Curated community areas including:
  - The Commons (main gathering space)
  - Start Here (onboarding guide)
  - Embodiment Practice
  - Touch & Affection
  - Spirituality, Sexuality & Integration
  - Couples, Closeness & Repair
  - Dating, Desire & Vulnerability
  - Intimacy Patterns
  - Masculinity, Sex, and Sexuality
  - Sacred Sexuality Practices
  - Workshops & Retreats
- **Space Membership** - Users join/leave spaces to customize their experience
- **Automatic Required Spaces** - "Start Here" and "The Commons" always included
- **Space Reordering** - Drag-and-drop to arrange spaces by preference
- **Optional Space Expiration** - "Start Here" becomes optional after 3 app visits

### Posts & Community Engagement
- **Create Posts** - Share thoughts, reflections, and experiences in spaces
- **Comments** - Respond to posts with threaded discussions
- **Reactions** - Quick reactions (likes, hearts, etc.) to posts and comments
- **Author Profiles** - Click author names/photos to view full profiles
- **Post Expansion** - Expand posts to see all comments and engage

### Daily Prompts & Reflections
- **58 Daily Prompts** - Rotating daily reflection questions
- **Prompt Responses** - Share responses as posts to spaces
- **Guidance Notes** - "A sentence or two is enough" encouragement
- **Modal Response Dialog** - Dedicated modal for responding to today's prompt
- **Auto-default to The Commons** - Responses default to The Commons space

### User Profiles
- **Profile Pages** - Public profiles showing:
  - Display name and pronouns
  - Location
  - Interests/tags
  - Pairing comfort level
  - Relationship status
  - What brought them here
  - Member since date
  - Profile photo
- **Photo Thumbnails** - Profile pictures appear on posts and comments
- **Avatar Generation** - Auto-generated colored avatars based on initials

### Quizzes
- **Quiz Hub** - Dedicated quizzes page showing available assessments
- **Quiz 1: Intimacy Pattern Quiz** - Assess relationship/intimacy patterns
- **Quiz 2: Erotic Relationship Evaluator** - Evaluate relationship dynamics
- **ScoreApp Integration** - Third-party quiz platform embedding
- **Full-Page Quiz Experience** - Dedicated pages for each quiz

### Events Management
- **Events Calendar** - View upcoming workshops and retreats
- **Event Admin Dashboard** - Create, edit, delete events without coding
- **Event Details** - Title, description, date, time, location, format (virtual/in-person/hybrid)
- **Event Interest Tracking** - Users can mark interest in events

### Start Here Onboarding Checklist
- **Interactive Checklist** - 5-item checklist in Start Here space:
  1. Complete Your Profile
  2. Explore Other Spaces
  3. Make Your First Post
  4. Take a Quiz
  5. Respond to Daily Prompt
- **Progress Tracking** - Visual progress bar showing completion %
- **Manual Completion** - Users check items off as they complete them
- **Persistent Progress** - Saves to localStorage

### Admin Features
- **Events Management Panel** - `/app/admin/events` for full CRUD on events
- **Admin Dashboard** - Central hub for admin functions
- **User Management** (future)
- **Content Moderation** (future)

### Design & UX
- **Custom Brand Colors** - Warm earth tones (#d4a574, #9d7f5c, #8fa878)
- **Logo** - The Connection Room branding with cache-busting
- **Responsive Design** - Mobile-first responsive layout
- **No Emojis** - Uses SVG icons instead of emoji for professional feel
- **Dark-Proof Aesthetic** - Warm, inviting, non-clinical design

### Demo/Testing Features
- **Demo Mode** - Full app access without authentication
- **Sample Data** - Pre-populated demo posts, comments, profiles
- **LocalStorage Fallback** - Works offline with browser storage
- **Visit Tracking** - Tracks app visits for feature unlock logic

### Technical Features
- **Responsive Grid Layouts** - Multi-column on desktop, single on mobile
- **Modal Dialogs** - Native HTML dialog element for prompts/forms
- **Real-time Data** - Supabase integration for live updates
- **Cache Busting** - Query parameters on assets for fresh loads
- **Form Validation** - Client-side validation on all inputs
- **Loading States** - Disabled buttons and loading indicators during submissions

## Planned/Future Features

- **Auto-complete Profile Items** - Automatically mark checklist items when completed
- **Space Permissions** - Role-based access (moderators, etc.)
- **Content Filters** - Search/filter posts by topic or author
- **Notifications** - Email/in-app notifications for engagement
- **User Preferences** - Customize notification and privacy settings
- **Reporting/Flagging** - Report inappropriate content
- **Couples Profiles** - Dedicated profiles for couples
- **Pairings System** - Pair matching for interested users
- **My Journey** - Personal activity timeline
- **Coaching Integration** - Connect with coaching services
