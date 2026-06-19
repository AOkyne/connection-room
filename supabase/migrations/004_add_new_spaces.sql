-- Add new community spaces

INSERT INTO spaces (id, name, slug, description, icon, color, featured_prompt, created_at)
VALUES
  ('masculinity-sex-sexuality', 'Masculinity, Sex, and Sexuality', 'masculinity-sex-sexuality', 'Exploring masculine sexuality, desire, vulnerability, and authentic expression without performance or shame', 'sexuality', '#d4a574', 'What does it mean to you to be sexually authentic as a man?', now()),
  ('sacred-sexuality', 'Sacred Sexuality Practices', 'sacred-sexuality', 'Spiritual approaches to sexuality, tantra, embodiment, and the sacred union of body and spirit', 'spirituality', '#d4a574', 'How do you experience the sacred in your sexuality?', now())
ON CONFLICT (id) DO NOTHING;
