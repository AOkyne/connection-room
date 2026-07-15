# Theme Tagging System - v1.3.1

## Overview

The Theme Tagging System connects community content (posts, spaces, events, articles, comments) with daily companion themes. This enables users to discover conversations and resources relevant to each day's theme.

## Architecture

### Database Schema

All content tables have a `theme_tags` JSONB column:
```sql
theme_tags JSONB DEFAULT '[]'::jsonb
```

Example:
```json
{
  "tags": ["boundaries", "vulnerability", "authenticity"]
}
```

### Tables with Theme Support

- `posts` — Community posts and responses
- `spaces` — Topic-based community spaces
- `events` — Upcoming community events
- `articles` — Learning resources and writing
- `comments` — Replies and discussions
- `daily_companion_content` — (For future) Tag themes to daily prompts

### Indexes

GIN indexes on all theme_tags columns enable fast theme-based queries:
```sql
CREATE INDEX idx_posts_theme_tags ON posts USING GIN (theme_tags);
```

## Common Themes

### Core Themes (Daily Companion)

The daily companion rotates through 120 days with themes such as:

1. **Receiving** — Capacity to receive, accept support, allow abundance
2. **Boundaries** — Healthy limits, saying no, defining personal space
3. **Desire** — Wanting, authentic desires, sexuality, passion
4. **Vulnerability** — Being seen, emotional openness, risk-taking
5. **Presence** — Being here now, attention, embodiment
6. **Authenticity** — Being real, truth, alignment
7. **Connection** — Relating with others, intimacy, belonging
8. **Intimacy** — Deep knowing, emotional/physical closeness
9. **Trust** — Faith in self and others, reliability
10. **Self-Awareness** — Knowing yourself, reflection, insight
11. **Practice** — Embodiment work, rituals, habit-forming
12. **Reflection** — Internal exploration, journaling, contemplation

Use lowercase with underscores: `"receiving"`, `"self_awareness"`, `"emotional_safety"`

## API

### Data Layer (`lib/data/theme-connections.ts`)

#### Get Posts by Theme
```typescript
const posts = await getThemeRelatedPosts("boundaries", limit: 5);
```

#### Get All Related Content
```typescript
const { posts, spaces, events, articles, isEmpty } = await getThemeRelatedContent("vulnerability");
```

#### Search by Multiple Themes
```typescript
const content = await searchContentByThemes(["boundaries", "authenticity"], limit: 10);
```

### Component (`components/dashboard/ThemeRelatedContent.tsx`)

Display theme-related content on the dashboard:
```tsx
<ThemeRelatedContent
  themeName="boundaries"
  themeTitle="Boundaries"
  loading={isLoading}
/>
```

## Integration Points

### Dashboard

The Explore section shows "Related to Today's Theme" content:

1. Fetches today's theme from `getTodaysDailyContent()`
2. Loads related posts, spaces, events, articles
3. Displays in `ThemeRelatedContent` component
4. Non-blocking — loads in background after primary content

### Content Creation

When users/admins create content, they should tag it with relevant themes:

**For Posts**: Auto-tag based on space or prompt context (future enhancement)

**For Spaces**: Admin tags on space creation or edit

**For Articles**: Admin tags when uploading or syncing from Substack

**For Events**: Admin tags on event creation

## Admin Tasks

### Tagging Existing Content

Via Supabase dashboard or SQL:

```sql
-- Tag a space with multiple themes
UPDATE spaces
SET theme_tags = '["boundaries", "authenticity"]'::jsonb
WHERE id = 'space-id-here';

-- Tag an article
UPDATE articles
SET theme_tags = '["desire", "vulnerability"]'::jsonb
WHERE id = 'article-id-here';
```

### Bulk Tagging by Content

```sql
-- Tag all posts in a space with a theme
UPDATE posts
SET theme_tags = theme_tags || '["trust"]'::jsonb
WHERE space_id = 'space-id-here'
AND NOT theme_tags @> '"trust"'::jsonb;
```

### Viewing Content by Theme

```sql
-- Find all posts with a theme tag
SELECT * FROM posts
WHERE theme_tags @> '"boundaries"'::jsonb
ORDER BY created_at DESC;

-- Find content with any of multiple themes
SELECT * FROM posts
WHERE theme_tags && '["boundaries", "vulnerability"]'::jsonb
ORDER BY created_at DESC;
```

## User Experience

### For Daily Users

1. User lands on dashboard
2. Sees today's theme (e.g., "Boundaries")
3. "Explore: Boundaries" section shows:
   - Recent posts about boundaries
   - Articles on boundaries
   - Spaces focused on boundaries
   - Events related to boundaries
4. User can click through to explore community conversations

### For Content Creators

When creating posts/articles/spaces:
1. Content is shown in "Related to Today's Theme" if tagged appropriately
2. Increases visibility of timely content
3. Encourages theme-aligned contributions

## Database Functions

### `matches_theme(tags JSONB, theme_name TEXT) → BOOLEAN`

Check if content has a theme:
```sql
SELECT * FROM posts WHERE matches_theme(theme_tags, 'boundaries');
```

### `get_content_by_theme(theme_name TEXT) → TABLE`

Get all content with a specific theme:
```sql
SELECT * FROM get_content_by_theme('vulnerability');
```

## Performance Considerations

### Indexes

GIN indexes on theme_tags enable efficient queries:
- `theme_tags @> '["boundaries"]'::jsonb` — O(log n)
- `theme_tags && '["boundaries", "desire"]'::jsonb` — O(log n)

### Query Strategy

All theme queries use `Promise.all()` for parallel loading:
1. Posts query starts
2. Spaces query starts (simultaneously)
3. Events query starts (simultaneously)
4. Articles query starts (simultaneously)
5. Results aggregated

This keeps theme content loading under 1s for typical data volumes.

## Future Enhancements

### Phase 7 (Optional)
- [ ] Admin UI for tagging content
- [ ] Bulk tagging operations
- [ ] Theme analytics (what's trending)
- [ ] User preference for theme notifications

### v1.3.2
- [ ] Theme-based email digests
- [ ] "This week's themes" newsletter
- [ ] User-initiated theme tagging on posts
- [ ] Theme-based space recommendations

### v1.4
- [ ] ML-based theme tagging suggestions
- [ ] User theme preferences and pinning
- [ ] Theme-based content curation
- [ ] Cross-theme recommendations

## Testing

### Manual Testing

1. **Check migration applied**:
   ```sql
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'posts' AND column_name = 'theme_tags';
   ```

2. **Verify indexes**:
   ```sql
   SELECT * FROM pg_indexes WHERE tablename IN ('posts', 'spaces', 'events', 'articles')
   AND indexname LIKE '%theme_tags%';
   ```

3. **Test queries**:
   ```sql
   -- Should return posts with "boundaries" tag
   SELECT * FROM posts WHERE theme_tags @> '"boundaries"'::jsonb LIMIT 5;
   ```

4. **Test component**:
   - Navigate to `/app`
   - Look for "Explore: [Theme]" section
   - Verify posts/spaces/events/articles from today's theme display

### Automated Tests (Future)

```typescript
describe("Theme Tagging System", () => {
  test("getThemeRelatedPosts returns posts with matching theme", async () => {
    const posts = await getThemeRelatedPosts("boundaries");
    expect(posts.length).toBeGreaterThan(0);
  });

  test("theme tags are properly indexed", async () => {
    // Verify query performance
  });

  test("ThemeRelatedContent component renders without data gracefully", () => {
    const { container } = render(
      <ThemeRelatedContent themeName="nonexistent" />
    );
    expect(container.firstChild).toBeNull();
  });
});
```

## Troubleshooting

### Theme content not appearing

1. **Check theme_tags column exists**:
   ```sql
   SELECT theme_tags FROM posts LIMIT 1;
   ```

2. **Verify content is tagged**:
   ```sql
   SELECT COUNT(*) FROM posts WHERE theme_tags != '[]'::jsonb;
   ```

3. **Check theme names match**:
   - Theme names must be lowercase
   - Use underscores for multi-word themes: `"self_awareness"`

4. **Verify RLS policies aren't blocking reads**:
   ```sql
   SELECT * FROM posts WHERE theme_tags @> '"boundaries"'::jsonb;
   -- Should return rows if any posts have that tag
   ```

### Slow theme queries

1. **Ensure GIN indexes exist**:
   ```sql
   CREATE INDEX idx_posts_theme_tags ON posts USING GIN (theme_tags);
   ```

2. **Monitor query performance**:
   ```sql
   EXPLAIN ANALYZE
   SELECT * FROM posts
   WHERE theme_tags @> '"boundaries"'::jsonb
   ORDER BY created_at DESC LIMIT 5;
   ```

## References

- Supabase JSONB Guide: https://www.postgresql.org/docs/current/datatype-json.html
- Daily Companion Architecture: [docs/DAILY_COMPANION.md](./docs/DAILY_COMPANION.md)
- Dashboard Hierarchy: [docs/DASHBOARD_HIERARCHY.md](./docs/DASHBOARD_HIERARCHY.md)
