import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

const escape = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

export const GET: APIRoute = async ({ site }) => {
  if (!site) throw new Error('`site` doit être défini dans astro.config.mjs pour générer le flux.');

  const entries = (await getCollection('ecrits', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf(),
  );

  const items = entries
    .map((e) => {
      const url = new URL(`/ecrits/${e.id}/`, site).href;
      // Le flux porte le résumé, pas le texte complet : on lit sur le site,
      // où la mise en page fait partie de ce qui est écrit.
      return [
        '    <item>',
        `      <title>${escape(e.data.title)}</title>`,
        `      <link>${escape(url)}</link>`,
        `      <guid isPermaLink="true">${escape(url)}</guid>`,
        `      <pubDate>${e.data.date.toUTCString()}</pubDate>`,
        `      <description>${escape(e.data.description)}</description>`,
        ...e.data.tags.map((t) => `      <category>${escape(t)}</category>`),
        '    </item>',
      ].join('\n');
    })
    .join('\n');

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Écrits — Philippe Lawson</title>
    <link>${escape(new URL('/ecrits/', site).href)}</link>
    <description>Textes sur la conception de systèmes, la sécurité par défaut et le travail avec des agents.</description>
    <language>fr-ca</language>
    <atom:link href="${escape(new URL('/rss.xml', site).href)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

  return new Response(feed, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
};
