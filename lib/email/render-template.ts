// Turns a stored email_templates row into the paragraphs sendBrandedEmail
// expects. Body convention: a blank line separates paragraphs, a single
// line break stays within a paragraph (used for bullet lists). Supports
// {{firstName}} and {{appUrl}} merge tags.
export function renderTemplateBody(
  body: string,
  vars: { firstName?: string; appUrl: string }
): string[] {
  const replaced = body
    .replace(/{{\s*firstName\s*}}/g, vars.firstName ?? "")
    .replace(/{{\s*appUrl\s*}}/g, vars.appUrl);

  return replaced
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}
