import type { MarkdownHeading } from 'astro';
import type { CollectionEntry } from 'astro:content';

export interface ProjectUpdate {
  /** Heading text after the date, e.g. "Open houses weigh funding-driven path forward". */
  title: string;
  /** Start of the period the heading's date token covers (UTC). */
  date: Date;
  /** Body text under the heading, as plain text. */
  summary: string;
  /** Anchor id Astro generated for the heading, when available. */
  anchor?: string;
}

// Matches "### 2026-05 — Title", "### 2025 — Title", "### 2016–2020 — Title".
// Headings without a leading date (e.g. "### Status — ...") are not treated as updates.
const DATED_HEADING = /^(\d{4})(?:-(\d{2}))?(?:\s*[–-]\s*\d{4}(?:-\d{2})?)?\s*[—–-]\s*(.+)$/;

/** Turn a Markdown snippet into a plain-text summary. */
function toPlainText(markdown: string): string {
  return markdown
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Undo smartypants substitutions so raw and rendered heading text compare equal. */
function headingKey(text: string): string {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, '...')
    .trim();
}

/**
 * Parse the dated `### YYYY-MM — ...` headings in a project's `## Updates` section.
 */
export function parseUpdates(entry: CollectionEntry<'projects'>): ProjectUpdate[] {
  const body = entry.body ?? '';
  const section = body.match(/^## Updates[^\n]*\n([\s\S]*?)(?=^## |(?![\s\S]))/m);
  if (!section) return [];

  // Map rendered h3 text -> generated id so feed links can point at the exact update.
  const anchors = new Map<string, string>();
  const headings = (entry.rendered?.metadata?.headings ?? []) as MarkdownHeading[];
  for (const h of headings) {
    if (h.depth === 3) anchors.set(headingKey(h.text), h.slug);
  }

  const updates: ProjectUpdate[] = [];
  const blocks = section[1].split(/^### /m).slice(1);
  for (const block of blocks) {
    const newline = block.indexOf('\n');
    const heading = (newline === -1 ? block : block.slice(0, newline)).trim();
    const match = heading.match(DATED_HEADING);
    if (!match) continue;

    const [, year, month, title] = match;
    updates.push({
      title: title.trim(),
      date: new Date(Date.UTC(Number(year), month ? Number(month) - 1 : 0, 1)),
      summary: toPlainText(newline === -1 ? '' : block.slice(newline + 1)),
      anchor: anchors.get(headingKey(toPlainText(heading))),
    });
  }
  return updates;
}
