import type { Block } from '@/content/pages';
import type { PageMeta } from '@/content/page-meta';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Reveal } from '@/components/ui/Reveal';
import styles from './Content.module.css';
import { Toc, type TocItem } from './Toc';

// Le texte provient de contenus statiques internes (balises b, i, sup uniquement, le reste est échappé à l'extraction).
const Rich = ({
  html,
  as: Tag = 'span',
  className,
  id,
}: {
  html: string;
  as?: 'span' | 'p' | 'li' | 'h2' | 'h3';
  className?: string;
  id?: string;
}) => <Tag id={id} className={className} dangerouslySetInnerHTML={{ __html: html }} />;

const plain = (html: string) => html.replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, ' ');
const slug = (s: string) =>
  plain(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

interface Section {
  id?: string;
  heading?: { html: string; level: number; icon?: IconName };
  blocks: Array<{ block: Block; index: number }>;
}

/** Découpe les blocs en sections : chaque titre h1/h2 ouvre une nouvelle section. */
function toSections(blocks: Block[], icons: IconName[] | undefined): Section[] {
  const sections: Section[] = [{ blocks: [] }];
  const used = new Set<string>();
  let h = 0;
  blocks.forEach((block, index) => {
    if (block.type === 'h' && block.level <= 2) {
      let id = slug(block.text) || `section-${h + 1}`;
      while (used.has(id)) id += '-2';
      used.add(id);
      sections.push({
        id,
        heading: { html: block.text, level: block.level, icon: icons?.[h % (icons.length || 1)] },
        blocks: [],
      });
      h += 1;
    } else {
      sections.at(-1)!.blocks.push({ block, index });
    }
  });
  return sections.filter((s) => s.heading || s.blocks.length);
}

const isStat = (title: string) => /^[≈×~<>]?\s?\d/.test(title.replace(/<[^>]+>/g, ''));

export function ContentBlocks({
  blocks,
  meta,
  toc = false,
}: {
  blocks: Block[];
  meta?: Pick<PageMeta, 'headings' | 'cards' | 'steps' | 'refs'>;
  toc?: boolean;
}) {
  const sections = toSections(blocks, meta?.headings);
  const items: TocItem[] = sections
    .filter((s) => s.id)
    .map((s) => ({ id: s.id!, label: plain(s.heading!.html) }));
  const showToc = toc && items.length >= 3;

  // Rang du bloc parmi les « cards » et parmi les listes ordonnées (pour retrouver ses icônes).
  let cardRank = -1;
  let stepRank = -1;
  const rank = new Map<number, number>();
  blocks.forEach((b, i) => {
    if (b.type === 'cards') rank.set(i, ++cardRank);
    if (b.type === 'list' && b.ordered) rank.set(i, ++stepRank);
  });

  const renderBlock = (b: Block, index: number) => {
    switch (b.type) {
      case 'h':
        return <Rich key={index} as="h3" html={b.text} />;
      case 'p':
        return <Rich key={index} as="p" html={b.text} />;
      case 'list': {
        if (b.ordered) {
          const icons = meta?.steps?.[rank.get(index) ?? 0];
          return (
            <ol key={index} className={meta?.refs ? styles.refList : styles.steps}>
              {b.items.map((t, j) => (
                <Reveal as="li" key={j} delay={Math.min(j, 5) * 70}>
                  {!meta?.refs && icons?.[j] ? (
                    <span className={styles.stepIcon}>
                      <Icon name={icons[j]!} size={20} />
                    </span>
                  ) : null}
                  <Rich html={t} />
                </Reveal>
              ))}
            </ol>
          );
        }
        return (
          <ul key={index} className={meta?.refs ? styles.refList : styles.checks}>
            {b.items.map((t, j) => (
              <Rich key={j} as="li" html={t} />
            ))}
          </ul>
        );
      }
      case 'cards': {
        const icons = meta?.cards?.[rank.get(index) ?? 0] ?? [];
        return (
          <div key={index} className={styles.cards} data-count={b.items.length}>
            {b.items.map((c, j) => {
              const icon = icons[j];
              const stat = !icon && (!!c.kicker || isStat(c.title));
              const myth = c.title.startsWith('«');
              return (
                <Reveal
                  as="article"
                  key={j}
                  delay={Math.min(j, 6) * 70}
                  className={`${styles.card} ${stat ? styles.stat : ''} ${myth ? styles.myth : ''}`}
                >
                  {icon ? (
                    <span className={styles.cardIcon}>
                      <Icon name={icon} size={22} />
                    </span>
                  ) : null}
                  {c.kicker ? (
                    <span className={icon ? styles.num : styles.kicker}>{c.kicker}</span>
                  ) : null}
                  {c.title ? (
                    <Rich
                      as="h3"
                      html={c.title}
                      className={stat && !c.kicker ? styles.statTitle : undefined}
                    />
                  ) : null}
                  {c.text.map((t, k) => (
                    <Rich key={k} as="p" html={t} />
                  ))}
                  {c.ref ? <Rich as="p" html={c.ref} className={styles.cardRef} /> : null}
                </Reveal>
              );
            })}
          </div>
        );
      }
    }
  };

  const body = (
    <div className={styles.prose}>
      {sections.map((s, i) => (
        <section key={s.id ?? `intro-${i}`} className={styles.section} aria-labelledby={s.id}>
          {s.heading ? (
            <Reveal className={styles.h2row}>
              {s.heading.icon ? (
                <span className={styles.h2icon}>
                  <Icon name={s.heading.icon} size={22} />
                </span>
              ) : null}
              <Rich as="h2" id={s.id} html={s.heading.html} />
            </Reveal>
          ) : null}
          {s.blocks.map(({ block, index }) => renderBlock(block, index))}
        </section>
      ))}
    </div>
  );

  // L'id doit être sur le titre pour que le sommaire le retrouve.
  const withIds = (
    <div className={showToc ? styles.layout : styles.layoutSolo}>
      {showToc ? <Toc items={items} /> : null}
      {body}
    </div>
  );
  return withIds;
}
