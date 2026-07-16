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

// Same {{firstName}}/{{appUrl}} merge tags, but for the broadcast
// composer's rich-text HTML body -- substituted in place rather than
// split into paragraphs, since the body is already real HTML.
export function substituteMergeTags(
  html: string,
  vars: { firstName?: string; appUrl: string }
): string {
  return html
    .replace(/{{\s*firstName\s*}}/g, vars.firstName ?? "")
    .replace(/{{\s*appUrl\s*}}/g, vars.appUrl);
}
