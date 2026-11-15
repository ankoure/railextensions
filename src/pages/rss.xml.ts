import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { parseUpdates } from '../lib/updates';

const MAX_ITEMS = 100;

export async function GET(context: APIContext) {
  const projects = await getCollection('projects');

  const items = projects
    .flatMap(entry =>
      parseUpdates(entry).map(update => {
        // The link doubles as the item's GUID, so the heading anchor keeps it unique per update.
        const link = `/projects/${entry.id}${update.anchor ? `#${update.anchor}` : ''}`;
        return {
          title: `${entry.data.projectName}: ${update.title}`,
          pubDate: update.date,
          description: update.summary,
          link,
          categories: [entry.data.agencyAbbr ?? entry.data.agency, entry.data.state],
        };
      }),
    )
    .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime())
    .slice(0, MAX_ITEMS);

  return rss({
    title: 'Rail Extension Tracker — Project Updates',
    description: 'Dated updates on rail extension and expansion projects across North America.',
    site: context.site!,
    items,
    customData: '<language>en-us</language>',
    // Links carry #anchors; a trailing slash would land after the fragment.
    trailingSlash: false,
  });
}
