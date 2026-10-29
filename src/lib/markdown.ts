import type { Block } from '@/content/pages';

/**
 * Mini-Markdown sûr pour les articles : titres (##, ###), paragraphes, listes (- et 1.), images ![texte](url),
 * **gras**, *italique* et [liens](url). Tout autre HTML est neutralisé : aucune balise saisie n'est interprétée.
 */
const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const safeUrl = (u: string) =>
  /^(https?:\/\/|\/)/i.test(u.trim()) && !/^\/\//.test(u.trim()) ? u.trim() : null;

export function inline(text: string): string {
  let out = esc(text);
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label: string, url: string) => {
    const u = safeUrl(url.replace(/&amp;/g, '&'));
    if (!u) return label;
    const external = /^https?:/i.test(u);
    return `<a href="${esc(u)}"${external ? ' target="_blank" rel="noopener"' : ''}>${label}</a>`;
  });
  out = out
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<i>$2</i>');
  return out;
}

export function parseMarkdown(md: string): Block[] {
  const blocks: Block[] = [];
  const lines = md.replace(/\r\n?/g, '\n').split('\n');
  let para: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushPara = () => {
    if (para.length) blocks.push({ type: 'p', text: inline(para.join(' ')) });
    para = [];
  };
  const flushList = () => {
    if (list) blocks.push({ type: 'list', ordered: list.ordered, items: list.items.map(inline) });
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const h = /^(#{1,3})\s+(.+)$/.exec(line);
    const ul = /^\s*[-*]\s+(.+)$/.exec(line);
    const ol = /^\s*\d+[.)]\s+(.+)$/.exec(line);
    const img = /^!\[([^\]]*)\]\(([^)\s]+)\)$/.exec(line.trim());
    if (!line.trim()) {
      flushPara();
      flushList();
    } else if (h) {
      flushPara();
      flushList();
      blocks.push({ type: 'h', level: Math.max(2, h[1]!.length) as 2 | 3, text: inline(h[2]!) });
    } else if (img && safeUrl(img[2]!)) {
      flushPara();
      flushList();
      blocks.push({ type: 'img', src: safeUrl(img[2]!)!, alt: img[1]! });
    } else if (ul || ol) {
      flushPara();
      const ordered = !!ol;
      if (list && list.ordered !== ordered) flushList();
      list = list ?? { ordered, items: [] };
      list.items.push((ul ?? ol)![1]!);
    } else {
      flushList();
      para.push(line.trim());
    }
  }
  flushPara();
  flushList();
  return blocks;
}

/** Durée de lecture estimée (≈ 200 mots par minute), au moins 1 minute. */
export const readMinutes = (md: string) =>
  Math.max(1, Math.round(md.split(/\s+/).filter(Boolean).length / 200));
export const wordCount = (md: string) => md.split(/\s+/).filter(Boolean).length;
