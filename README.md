# The Connection Room by Trevor James - Phase 1

A beautiful, intentional community web app for men and couples practicing honest connection, embodied intimacy, spirituality, sexuality, and integration.

## 🔒 Privacy & Security

Member profile data is split across a private `profiles` table (owner +
admin only) and a public `public_profiles` table (safe fields, with
per-field visibility controls) — see [`PRIVACY_SECURITY_MODEL.md`](PRIVACY_SECURITY_MODEL.md)
for the full model, including RLS behavior, what's public vs. private, and
known limitations.

## 🎯 Project Status

**Phase 1 - MVP (Demo Mode Complete)**

This is a beautiful, fully functional demo version of the app. All data is stored locally using localStorage. The app is ready for visual design testing, interaction refinement, and demo deployments.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- No database setup required

### Installation

```bash
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### Demo Access

- **Landing Page**: Public exploration of the community concept
- **Demo Member**: Full community access, all features
- **Demo Admin**: Admin dashboard and management tools

No account creation required—just click "Continue as Demo Member" or "Continue as Demo Admin."

## 📁 Project Structure

```
connection-room/
├── app/                      # Next.js app routes
│   ├── page.tsx              # Landing page
│   ├── auth/page.tsx         # Sign-in
│   ├── app/                  # Protected routes
│   │   ├── page.tsx          # Home/dashboard
│   │   ├── spaces/           # Community spaces
│   │   ├── pairings/         # Connection pairings
│   │   ├── journey/          # User journey
│   │   ├── profile/          # Profile editor
│   │   └── admin/            # Admin dashboard
│   └── layout.tsx
├── lib/
│   ├── config.ts             # Central configuration
│   ├── theme.ts              # Design tokens
│   ├── session.ts            # Demo auth
│   └── data/
│       ├── profiles.ts
│       ├── spaces.ts
│       └── demo-data.ts
├── components/               # Reusable UI components
│   ├── Button.tsx
│   └── Card.tsx
├── .env.example
└── package.json
```

## 🎨 Design

**Warm, Elegant, Minimal**
- Cream background (#fdfbf7)
- Warm gold accent (#c9a876)
- Spacious layouts, large typography
- Rounded cards with soft shadows
- Mobile-first responsive design

The app feels like a candlelit circle, a quiet retreat, and a thoughtful coaching portal.

## 💾 Data & Demo Mode

- All data stored in browser's localStorage
- No backend server required for Phase 1
- Data persists until browser cache is cleared
- Includes 9 spaces, 10+ prompts, sample posts, badges, and events

## 🔧 Scripts

```bash
npm run dev      # Development server
npm run build    # Production build
npm start        # Start production server
npm run lint     # Lint and type check
```

## 📱 Responsive Design

- Mobile bottom navigation
- Desktop sidebar navigation
- Fully mobile-friendly layouts

## ⚙️ Configuration

All app configuration is in `lib/config.ts`:
- App name, tagline, branding
- External URLs (quiz, consult, etc.)
- Colors and theme
- Member types, interests, community agreements
- Relationship structures and couple goals

Update this file to customize the app.

## 🌐 Environment Variables

Optional (defaults in `config.ts`):
```bash
NEXT_PUBLIC_SUPABASE_URL=          # Phase 2
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # Phase 2
NEXT_PUBLIC_QUIZ_URL=
NEXT_PUBLIC_CONSULT_URL=
```

## ✨ Phase 1 Features

- ✅ Beautiful landing and sign-in pages
- ✅ Demo member and admin modes
- ✅ 9 community spaces (join/leave)
- ✅ Daily/weekly prompts
- ✅ Posts, comments, gentle reactions
- ✅ User profiles (editable)
- ✅ Pairing preferences and demo pairings
- ✅ Badges and achievements
- ✅ Admin dashboard
- ✅ Mobile responsive
- ✅ localStorage persistence
- ✅ TypeScript throughout

## 🚀 Phase 2 (Coming)

- Supabase authentication
- Real database
- Real user invitations
- Email notifications
- Real pairings
- Scheduled prompts
- Advanced admin tools
- Vercel deployment

## 📖 Quick Component Usage

**Button**
```jsx
<Button variant="primary" | "secondary" | "outline" | "ghost" size="sm" | "md" | "lg">
  Label
</Button>
```

**Card**
```jsx
<Card>
  <CardHeader title="Title" icon="🎯" />
  Content
  <CardFooter>Actions</CardFooter>
</Card>
```

## 🧪 Testing

- Load [http://localhost:3000](http://localhost:3000)
- Try demo member and admin modes
- Edit profile and explore spaces
- Check mobile layout
- Refresh page to verify localStorage persistence

## 📞 Questions?

See `lib/config.ts` for all configurable values. The app is designed to be easy to customize and deploy.

---

© 2024 Trevor James LLC
