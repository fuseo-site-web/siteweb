/** Texte → adresse lisible : « Lumière du matin & jet lag » → « lumiere-du-matin-jet-lag ». */
export function slugify(input: string, max = 80): string {
  const s = input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/œ/gi, 'oe')
    .replace(/æ/gi, 'ae')
    .toLowerCase()
    .replace(/&/g, ' et ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s.slice(0, max).replace(/-+$/g, '');
}

/** Nom de fichier d'image adapté au référencement : titre de l'article + description de l'image. */
export function imageFileName(title: string, alt: string, n = 1): string {
  const base =
    [slugify(title, 50), slugify(alt || 'illustration', 30)].filter(Boolean).join('-') || 'image';
  return `${base}${n > 1 ? `-${n}` : ''}.webp`;
}
