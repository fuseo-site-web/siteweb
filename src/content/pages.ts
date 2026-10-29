export type Block =
  | { type: 'h'; level: 1 | 2 | 3; text: string }
  | { type: 'p'; text: string }
  | { type: 'img'; src: string; alt: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | {
      type: 'cards';
      items: Array<{ kicker?: string; title: string; text: string[]; ref?: string }>;
    };

export interface Page {
  title: string;
  lead: string;
  blocks: Block[];
}

export type PageName =
  | 'science'
  | 'method'
  | 'sources'
  | 'transparency'
  | 'gear'
  | 'pro'
  | 'mentions'
  | 'cgv'
  | 'privacy'
  | 'cgu'
  | 'cookies'
  | 'accessibility';

/** Documents juridiques rédigés en français (version qui fait foi), identiques dans toutes les langues. */
export const LEGAL_PAGES: PageName[] = ['cgv', 'privacy', 'cgu', 'cookies', 'accessibility'];

export async function getPage(locale: string, name: PageName): Promise<Page> {
  if (LEGAL_PAGES.includes(name)) return (await import(`./legal/${name}`)).default as Page;
  const lang = ['fr', 'en', 'es'].includes(locale) ? locale : 'fr';
  return (await import(`./pages/${lang}/${name}.json`)).default as Page;
}
