-- Phase 6: Seed initial theme tags for content discovery
-- Tags sample posts, articles, spaces, and events with common themes
-- Enables theme-related content recommendations on dashboard

-- Define common themes that appear in daily companion
-- These map to daily themes and serve as discovery keywords
-- Examples: "receiving", "boundaries", "desire", "vulnerability", "presence", "authenticity", etc.

-- Update articles with theme tags (if articles table has content)
UPDATE articles
SET theme_tags = CASE
  WHEN title ILIKE '%boundaries%' THEN '["boundaries"]'::jsonb
  WHEN title ILIKE '%receiving%' THEN '["receiving"]'::jsonb
  WHEN title ILIKE '%desire%' THEN '["desire"]'::jsonb
  WHEN title ILIKE '%vulnerability%' THEN '["vulnerability"]'::jsonb
  WHEN title ILIKE '%presence%' THEN '["presence"]'::jsonb
  WHEN title ILIKE '%authenticity%' THEN '["authenticity"]'::jsonb
  WHEN title ILIKE '%connection%' THEN '["connection"]'::jsonb
  WHEN title ILIKE '%intimacy%' THEN '["intimacy"]'::jsonb
  WHEN title ILIKE '%trust%' THEN '["trust"]'::jsonb
  WHEN title ILIKE '%self%' OR title ILIKE '%awareness%' THEN '["self-awareness"]'::jsonb
  ELSE '[]'::jsonb
END
WHERE theme_tags = '[]'::jsonb;

-- Update spaces with theme tags based on description or common space purposes
UPDATE spaces
SET theme_tags = CASE
  WHEN name ILIKE '%boundaries%' OR description ILIKE '%boundaries%' THEN '["boundaries"]'::jsonb
  WHEN name ILIKE '%desire%' OR description ILIKE '%desire%' THEN '["desire"]'::jsonb
  WHEN name ILIKE '%vulnerability%' OR description ILIKE '%vulnerability%' THEN '["vulnerability"]'::jsonb
  WHEN name ILIKE '%connection%' OR description ILIKE '%connection%' THEN '["connection"]'::jsonb
  WHEN name ILIKE '%intimacy%' OR description ILIKE '%intimacy%' THEN '["intimacy"]'::jsonb
  WHEN name ILIKE '%trust%' OR description ILIKE '%trust%' THEN '["trust"]'::jsonb
  WHEN name ILIKE '%authentic%' OR description ILIKE '%authentic%' THEN '["authenticity"]'::jsonb
  WHEN name ILIKE '%practice%' OR description ILIKE '%practice%' THEN '["practice"]'::jsonb
  WHEN name ILIKE '%reflection%' OR description ILIKE '%reflection%' THEN '["reflection"]'::jsonb
  WHEN name ILIKE '%awareness%' OR description ILIKE '%awareness%' THEN '["self-awareness"]'::jsonb
  ELSE '[]'::jsonb
END
WHERE theme_tags = '[]'::jsonb;

-- Update events with theme tags
UPDATE events
SET theme_tags = CASE
  WHEN title ILIKE '%boundaries%' THEN '["boundaries"]'::jsonb
  WHEN title ILIKE '%desire%' THEN '["desire"]'::jsonb
  WHEN title ILIKE '%vulnerability%' THEN '["vulnerability"]'::jsonb
  WHEN title ILIKE '%connection%' THEN '["connection"]'::jsonb
  WHEN title ILIKE '%intimacy%' THEN '["intimacy"]'::jsonb
  WHEN title ILIKE '%practice%' THEN '["practice"]'::jsonb
  WHEN title ILIKE '%reflection%' THEN '["reflection"]'::jsonb
  WHEN title ILIKE '%presence%' THEN '["presence"]'::jsonb
  ELSE '[]'::jsonb
END
WHERE theme_tags = '[]'::jsonb;

-- Theme Tag Mapping Reference (for documentation)
-- Use this mapping when tagging content manually or via admin interfaces
/*
Common Themes from Daily Companion:
1. "receiving" - Capacity to receive, accept support, allow abundance
2. "boundaries" - Healthy limits, saying no, defining personal space
3. "desire" - Wanting, authentic desires, sexuality, passion
4. "vulnerability" - Being seen, emotional openness, risk-taking
5. "presence" - Being here now, attention, embodiment
6. "authenticity" - Being real, truth, alignment
7. "connection" - Relating with others, intimacy, belonging
8. "intimacy" - Deep knowing, emotional/physical closeness
9. "trust" - Faith in self and others, reliability
10. "self-awareness" - Knowing yourself, reflection, insight
11. "practice" - Embodiment work, rituals, habit-forming
12. "reflection" - Internal exploration, journaling, contemplation

Future: Could expand to include seasonal themes, emotional states, body-centered themes
*/
