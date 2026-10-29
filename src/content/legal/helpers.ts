import type { Block, Page } from '../pages';

export const h = (text: string): Block => ({ type: 'h', level: 2, text });
export const p = (text: string): Block => ({ type: 'p', text });
export const ul = (...items: string[]): Block => ({ type: 'list', ordered: false, items });
export const page = (title: string, lead: string, ...blocks: Block[]): Page => ({
  title,
  lead,
  blocks,
});

export const EDITOR =
  'SLEEPTECHNOLOGY, société par actions simplifiée au capital de 520 €, immatriculée au RCS de Nanterre sous le numéro 933 908 196, dont le siège social est situé 130B avenue Charles de Gaulle, 92200 Neuilly-sur-Seine (« Fuseo »)';
export const VERSION = 'Version du 27 octobre 2026, en cours de validation.';
