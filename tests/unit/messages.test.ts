import { describe, expect, it } from 'vitest';
import en from '../../messages/en.json';
import es from '../../messages/es.json';
import fr from '../../messages/fr.json';

function keys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object'
      ? keys(v as Record<string, unknown>, `${prefix}${k}.`)
      : [`${prefix}${k}`],
  );
}

describe('messages i18n', () => {
  it.each([
    ['en', en],
    ['es', es],
  ])('%s expose les mêmes clés que fr', (_locale, messages) => {
    expect(keys(messages).sort()).toEqual(keys(fr).sort());
  });
});
