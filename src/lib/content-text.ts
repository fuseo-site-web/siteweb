import type { Block } from '@/content/pages';

/** Texte des pages en Markdown propre (pour llms-full.txt et les outils MCP) : pur, sans dépendance serveur. */

const ENT: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  '#x27': "'",
  '#39': "'",
};

export function htmlToMd(html: string, base = ''): string {
  return html
    .replace(
      /<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi,
      (_m, href: string, label: string) => {
        const url = href.startsWith('/') ? `${base}${href}` : href;
        return `[${label.replace(/<[^>]+>/g, '')}](${url})`;
      },
    )
    .replace(/<(b|strong)>([\s\S]*?)<\/\1>/gi, '**$2**')
    .replace(/<(i|em)>([\s\S]*?)<\/\1>/gi, '*$2*')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&([a-z#0-9]+);/gi, (m, e: string) => ENT[e.toLowerCase()] ?? m)
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

export function blocksToMarkdown(blocks: Block[], base = ''): string {
  const out: string[] = [];
  for (const b of blocks) {
    if (b.type === 'h')
      out.push(`${'#'.repeat(Math.min(6, Math.max(2, b.level + 1)))} ${htmlToMd(b.text, base)}`);
    else if (b.type === 'p') out.push(htmlToMd(b.text, base));
    else if (b.type === 'list') {
      out.push(
        b.items.map((t, i) => `${b.ordered ? `${i + 1}.` : '-'} ${htmlToMd(t, base)}`).join('\n'),
      );
    } else if (b.type === 'cards') {
      for (const c of b.items) {
        out.push(
          [
            `#### ${htmlToMd(c.title, base)}`,
            c.kicker ? `*${htmlToMd(c.kicker, base)}*` : '',
            ...c.text.map((t) => htmlToMd(t, base)),
          ]
            .filter(Boolean)
            .join('\n\n'),
        );
      }
    } else if (b.type === 'img') out.push(b.alt ? `![${b.alt}](${b.src})` : `![](${b.src})`);
  }
  return out.filter(Boolean).join('\n\n');
}
