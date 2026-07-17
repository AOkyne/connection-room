# The Connection Room - Architecture Document

## Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Components**: Custom React components
- **Client State**: React hooks (useState, useEffect, useRef)
- **Routing**: Next.js App Router with dynamic routes

### Backend
- **Runtime**: Node.js (via Next.js)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (email/password)
- **Storage**: Browser localStorage for demo mode

### Third-Party Services
- **Quiz Platform**: ScoreApp (embedded quiz widgets)
- **Icons**: Custom SVG icon components
- **Analytics**: GitHub/Vercel deployment

---

## Project Structure

```
connection-room/
├── app/                          # Next.js app directory
│   ├── app/                      # Authenticated app routes
│   │   ├── page.tsx             # Home/dashboard
│   │   ├── layout.tsx           # App layout with navigation
│   │   ├── spaces/              # Community spaces
│   │   │   ├── page.tsx         # Spaces list/management
│   │   │   └── [id]/            # Space detail pages
│   │   ├── users/[userId]/      # User profile pages
│   │   ├── quizzes/             # Quiz features
│   │   ├── events/              # Events pages
│   │   ├── admin/               # Admin features
│   │   ├── profile/             # User profile settings
│   │   ├── journey/             # User activity timeline
│   │   ├── pairings/            # Pairing features
│   │   └── reflect/             # Reflection response page
│   ├── auth/                     # Authentication pages
│   ├── onboarding/              # Signup flow
│   ├── page.tsx                 # Public landing page
│   └── layout.tsx               # Root layout
│
├── lib/                          # Shared utilities and data
│   ├── data/                    # Data access layer
│   │   ├── posts.ts            # Post CRUD operations
│   │   ├── spaces.ts           # Space management
│   │   ├── profiles.ts         # User profiles
│   │   ├── comments.ts         # Comment operations
│   │   ├── checklist.ts        # Onboarding checklist
│   │   ├── events.ts           # Event data
│   │   ├── demo-data.ts        # Demo/seed data
│   │   └── recommendations.ts  # Daily prompts & suggestions
│   ├── supabase/               # Database operations
│   │   ├── client.ts           # Supabase client setup
│   │   ├── supabase-posts.ts   # Post DB queries
│   │   ├── supabase-spaces.ts  # Space DB queries
│   │   ├── supabase-profiles.ts # Profile DB queries
│   │   └── supabase-comments.ts # Comment DB queries
│   ├── auth/                   # Authentication utilities
│   │   └── supabase.ts         # Auth functions
│   ├── session.ts              # Session management
│   ├── config.ts               # App configuration
│   └── app-mode.ts             # Demo vs beta mode
│
├── components/                  # Reusable React components
│   ├── Card.tsx                # Card container
│   ├── Button.tsx              # Button component
│   ├── Icons.tsx               # Icon components
│   ├── SpaceIconSVG.tsx        # Space-specific icons
│   └── StartHereChecklist.tsx  # Onboarding checklist
│
├── public/                      # Static assets
│   ├── favicon.ico             # Browser tab icon
│   └── Connection-room-logo.png # Brand logo
│
├── supabase/                    # Database migrations
│   └── migrations/             # SQL migrations
│       ├── 001_beta_schema.sql # Core tables
│       ├── 002_seed_example_content.sql
│       ├── 003_add_reactions_policies.sql
│       └── 004_add_new_spaces.sql
│
├── FEATURE_LIST.md             # Feature documentation
├── ARCHITECTURE.md             # This file
├── DATABASE_SCHEMA.md          # Database schema docs
└── package.json                # Dependencies
```

---

## Data Flow Architecture

### Authentication Flow
```
Login Page (auth/page.tsx)
    ↓
Supabase Auth API
    ↓
Session Token → Supabase
    ↓
User Profile Data
    ↓
App Dashboard (/app)
```

### Post Creation Flow
```
Space Detail Page
    ↓
Create Post Form
    ↓
getCurrentUserId() → Supabase Auth
    ↓
createPost() → supabase-posts.ts
    ↓
Database Insert
    ↓
Refresh Posts List
```

### Data Access Pattern (Dual Mode)
```
getSpaces()
    ↓
Is User Authenticated? (getCurrentUserId)
    ├─ YES → getSupabaseSpaces() → Database
    └─ NO → localStorage check
             ├─ Has cached data? → Return cached
             └─ No cache → Return demoSpaces
```

---

## Key Design Patterns

### 1. Async-First Data Layer
- All data functions are async
- Supabase queries checked first
- localStorage fallback for demo mode
- Type-safe with TypeScript interfaces

### 2. Component Composition
- Small, reusable components (Card, Button)
- Separate concerns (UI vs data)
- Props-based configuration
- Minimal internal state

### 3. Server-First with Client Fallback
- Supabase primary data source
- localStorage backup for offline/demo
- Demo mode for unauthenticated users
- Beta mode for authenticated users

### 4. Row Level Security (RLS)
- Supabase policies enforce:
  - Full profile data (`profiles`): owner and admins only — no other
    member can read another member's row
  - Cross-member profile display uses a separate `public_profiles` table
    (a curated, member-controlled field set with per-field visibility
    toggles — identity/story fields default visible, deeper fields default
    hidden) plus a column-masking view, `public_profiles_view` — never the
    private `profiles` table. The app-layer `CommunityProfile` TypeScript
    type (in `lib/data/profiles.ts`) is structurally narrower than the
    private `Profile` type for the same reason: it can't carry fields that
    were never meant to leave the private table.
    See [`PRIVACY_SECURITY_MODEL.md`](PRIVACY_SECURITY_MODEL.md).
  - Connection matching runs server-side (`app/api/matching/find`) with
    the service-role key, since scoring needs private fields — only safe,
    visibility-respecting match results are returned to the client, and
    hidden/shared-spaces-restricted profiles are excluded from suggestions.
  - Space members can read/write posts
  - Comments follow post visibility rules
  - Reactions are visible to space members

---

## State Management

### Local Component State
- `useState` for form inputs, UI state
- `useEffect` for data loading
- `useRef` for DOM elements (modal dialogs)

### Session State
- Stored in `lib/session.ts`
- Managed by Supabase Auth
- Persists in browser session storage

### Data Caching
- localStorage for demo data
- In-memory for current session
- No global state management (Redux, Context)

---

## Authentication & Security

### Auth Methods
1. **Email/Password** - Traditional auth
2. **Demo Mode** - Instant access, no login

### Security Measures
- Supabase RLS enforces data privacy
- SQL injection prevention (parameterized queries)
- XSS prevention (React escaping)
- CORS enabled for API access
- Environment variables for secrets

### Session Management
- `getSession()` checks Supabase auth status
- `clearSession()` logs out and clears state
- Auto-redirect to `/auth` if not authenticated

---

## Database Approach

### Dual Mode Architecture
1. **Beta Mode** (Authenticated)
   - Uses Supabase PostgreSQL
   - Real-time persistent data
   - RLS enforced
   
2. **Demo Mode** (Unauthenticated)
   - Uses browser localStorage
   - Session-only persistence
   - No RLS (all data visible)
   - For testing and ChatGPT review

---

## Performance Considerations

### Caching Strategy
- Static assets cached with `?v=2` query params
- Data cached in localStorage for demo mode
- In-memory caching during session
- Lazy-load comments on post expansion

### Loading Patterns
- Mount-check to prevent hydration mismatch
- Loading spinners during data fetch
- Disabled buttons during submission
- Optimistic UI updates

### Asset Optimization
- SVG icons (no image files)
- Minimal external dependencies
- Tailwind CSS for styling (no extra CSS files)
- Responsive images (logos)

---

## Deployment

### Hosting
- **Deployed on**: Vercel (Next.js native)
- **Auto-deploy**: On push to main branch
- **Domain**: Connected to Vercel

### Database
- **Hosted on**: Supabase (PostgreSQL in cloud)
- **Backups**: Supabase automated
- **Migration**: Manual SQL migrations

### Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
```

---

## Extensibility & Future Improvements

### Planned Enhancements
1. **Real-time Updates** - Supabase subscriptions
2. **Search** - Full-text search in posts
3. **Notifications** - Email/push notifications
4. **Analytics** - User engagement metrics
5. **Moderation** - Content review tools
6. **Roles** - Admin/moderator permissions

### Architecture Readiness
- Modular data layer supports new features
- Component system allows UI expansion
- Database schema allows new tables
- Type system guides new development
