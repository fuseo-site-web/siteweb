'use client';

import {
  Bold,
  Eye,
  EyeOff,
  Heading2,
  ImagePlus,
  Italic,
  Link2,
  List,
  Save,
  Send,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import { deletePost, savePost } from '@/app/admin/blog/actions';
import { parseMarkdown, wordCount } from '@/lib/markdown';
import { slugify } from '@/lib/slug';
import styles from './Admin.module.css';
import { Info } from './Info';

export interface EditorPost {
  id: string | null;
  title: string;
  slug: string;
  locale: 'fr' | 'en' | 'es';
  excerpt: string;
  topic: string;
  bodyMd: string;
  coverUrl: string | null;
  coverAlt: string;
  seoTitle: string;
  seoDescription: string;
  status: 'draft' | 'published';
}

const kb = (n: number) =>
  n > 1_000_000 ? `${(n / 1_000_000).toFixed(1)} Mo` : `${Math.round(n / 1000)} Ko`;

interface Uploaded {
  url: string;
  name: string;
  bytes: number;
  originalBytes: number;
}

export function BlogEditor({ initial, topics }: { initial: EditorPost; topics: string[] }) {
  const router = useRouter();
  const [p, setP] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(!!initial.id);
  const [imgAlt, setImgAlt] = useState('');
  const [preview, setPreview] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState<'cover' | 'body' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, start] = useTransition();
  const area = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const set = <K extends keyof EditorPost>(k: K, v: EditorPost[K]) => {
    setP((s) => ({ ...s, [k]: v }));
    setMsg(null);
  };

  async function upload(file: File, alt: string): Promise<Uploaded | null> {
    setBusy(true);
    setMsg(null);
    const fd = new FormData();
    fd.set('file', file);
    fd.set('title', p.title || 'article');
    fd.set('alt', alt);
    try {
      const r = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      if (!r.ok) {
        const e = (await r.json().catch(() => ({}))) as { error?: string };
        setMsg({
          ok: false,
          text:
            e.error === 'not_an_image'
              ? "Ce fichier n'est pas une image lisible."
              : e.error === 'too_large'
                ? 'Image trop lourde (12 Mo maximum).'
                : "L'envoi de l'image a échoué.",
        });
        return null;
      }
      return (await r.json()) as Uploaded;
    } finally {
      setBusy(false);
    }
  }

  const insertAtCursor = (text: string) => {
    const el = area.current;
    const at = el?.selectionStart ?? p.bodyMd.length;
    const end = el?.selectionEnd ?? at;
    const next = `${p.bodyMd.slice(0, at)}${text}${p.bodyMd.slice(end)}`;
    set('bodyMd', next);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(at + text.length, at + text.length);
    });
  };

  const wrap = (left: string, right = left, placeholder = 'texte') => {
    const el = area.current;
    const a = el?.selectionStart ?? 0;
    const b = el?.selectionEnd ?? 0;
    const sel = p.bodyMd.slice(a, b) || placeholder;
    insertAtCursor(`${left}${sel}${right}`);
  };

  async function dropCover(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    const up = await upload(f, p.coverAlt || 'couverture');
    if (up) {
      set('coverUrl', up.url);
      setMsg({
        ok: true,
        text: `Image de couverture ajoutée : ${up.name} (${kb(up.originalBytes)} → ${kb(up.bytes)} en WebP).`,
      });
    }
  }

  async function dropBody(files: FileList | null) {
    for (const f of Array.from(files ?? [])) {
      const alt = imgAlt || 'illustration';
      const up = await upload(f, alt);
      if (up) {
        insertAtCursor(`\n\n![${alt}](${up.url})\n\n`);
        setMsg({
          ok: true,
          text: `Image insérée : ${up.name} (${kb(up.originalBytes)} → ${kb(up.bytes)} en WebP).`,
        });
      }
    }
  }

  const save = (status: 'draft' | 'published') =>
    start(async () => {
      const slug = p.slug || slugify(p.title);
      const r = await savePost({
        id: p.id,
        title: p.title,
        slug,
        locale: p.locale,
        excerpt: p.excerpt,
        topic: p.topic || 'Conseils',
        bodyMd: p.bodyMd,
        coverUrl: p.coverUrl,
        coverAlt: p.coverAlt,
        seoTitle: p.seoTitle || null,
        seoDescription: p.seoDescription || null,
        status,
      });
      if (!r.ok) {
        setMsg({
          ok: false,
          text:
            r.error === 'slug_taken'
              ? 'Cette adresse (slug) est déjà utilisée par un autre article.'
              : r.error === 'invalid'
                ? "Vérifiez le titre (3 caractères minimum) et l'adresse de l'article."
                : "L'enregistrement a échoué.",
        });
        return;
      }
      setP((s) => ({ ...s, id: r.id, slug, status }));
      setMsg({
        ok: true,
        text:
          status === 'published'
            ? 'Article publié : il est visible sur le blog.'
            : 'Brouillon enregistré.',
      });
      if (!p.id) router.replace(`/admin/blog/${r.id}`);
    });

  const remove = () =>
    start(async () => {
      if (!p.id) return;
      const r = await deletePost(p.id);
      if (r.ok) router.replace('/admin/blog');
      else setMsg({ ok: false, text: 'La suppression a échoué.' });
    });

  // Aide au référencement : quelques contrôles simples, en direct.
  const words = wordCount(p.bodyMd);
  const titleLen = (p.seoTitle || p.title).length;
  const descLen = (p.seoDescription || p.excerpt).length;
  const checks: Array<[boolean, string]> = [
    [titleLen >= 20 && titleLen <= 60, `Titre de 20 à 60 caractères (actuellement ${titleLen})`],
    [
      descLen >= 70 && descLen <= 160,
      `Description de 70 à 160 caractères (actuellement ${descLen})`,
    ],
    [words >= 300, `Au moins 300 mots (actuellement ${words})`],
    [/^##\s/m.test(p.bodyMd), 'Au moins un intertitre (##)'],
    [
      !!p.coverUrl && p.coverAlt.trim().length > 4,
      'Image de couverture avec description (texte alternatif)',
    ],
  ];
  const score = checks.filter(([ok]) => ok).length;

  return (
    <div className={styles.editor}>
      <div className={styles.stack}>
        <section className={styles.card}>
          <div className={styles.stack}>
            <label className={styles.field}>
              Titre de l&apos;article
              <input
                value={p.title}
                maxLength={200}
                placeholder="Ex. : Comment la lumière du matin réduit le jet lag"
                onChange={(e) => {
                  set('title', e.target.value);
                  if (!slugTouched) set('slug', slugify(e.target.value, 90));
                }}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>
                Adresse de l&apos;article (slug)
                <Info
                  title="Adresse de l'article"
                  example="« lumiere-du-matin-jet-lag » donne fuseo.net/blog/lumiere-du-matin-jet-lag"
                >
                  La fin du lien de l&apos;article. Elle est créée à partir du titre, sans accents
                  ni espaces. Une adresse claire, avec les bons mots-clés, aide Google à comprendre
                  le sujet.
                </Info>
              </span>
              <input
                value={p.slug}
                maxLength={120}
                onChange={(e) => {
                  setSlugTouched(true);
                  set('slug', slugify(e.target.value, 120));
                }}
              />
              <small>fuseo.net/blog/{p.slug || '…'}</small>
            </label>
            <label className={styles.field}>
              Résumé (affiché sur les cartes et dans Google)
              <textarea
                value={p.excerpt}
                maxLength={400}
                style={{ minHeight: 80 }}
                onChange={(e) => set('excerpt', e.target.value)}
              />
              <small>{p.excerpt.length}/160 caractères conseillés</small>
            </label>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.toolbar} style={{ marginBottom: 10, alignItems: 'center' }}>
            <b>Contenu</b>
            <Info
              title="Écrire l'article"
              example="## Un titre de section, puis un paragraphe, puis une liste avec des tirets."
            >
              Écrivez en texte simple. Les boutons ajoutent la mise en forme : titre de section,
              gras, italique, liste, lien. Pour ajouter une image, glissez-la directement dans la
              zone de texte : elle est convertie en WebP et insérée à l&apos;endroit du curseur.
            </Info>
            <span style={{ flex: 1 }} />
            <button type="button" className={styles.btnGhost} onClick={() => setPreview((v) => !v)}>
              {preview ? <EyeOff size={16} /> : <Eye size={16} />} {preview ? 'Modifier' : 'Aperçu'}
            </button>
          </div>
          {preview ? (
            <Preview md={p.bodyMd} />
          ) : (
            <>
              <div className={styles.toolbar} style={{ marginBottom: 8 }}>
                <button
                  type="button"
                  className={styles.btnGhost}
                  onClick={() => insertAtCursor('\n\n## Titre de section\n\n')}
                  aria-label="Titre de section"
                >
                  <Heading2 size={16} />
                </button>
                <button
                  type="button"
                  className={styles.btnGhost}
                  onClick={() => wrap('**')}
                  aria-label="Gras"
                >
                  <Bold size={16} />
                </button>
                <button
                  type="button"
                  className={styles.btnGhost}
                  onClick={() => wrap('*')}
                  aria-label="Italique"
                >
                  <Italic size={16} />
                </button>
                <button
                  type="button"
                  className={styles.btnGhost}
                  onClick={() => insertAtCursor('\n- élément\n- élément\n')}
                  aria-label="Liste"
                >
                  <List size={16} />
                </button>
                <button
                  type="button"
                  className={styles.btnGhost}
                  onClick={() => wrap('[', '](https://)', 'texte du lien')}
                  aria-label="Lien"
                >
                  <Link2 size={16} />
                </button>
                <button
                  type="button"
                  className={styles.btnGhost}
                  onClick={() => fileInput.current?.click()}
                  aria-label="Ajouter une image"
                >
                  <ImagePlus size={16} />
                </button>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={(e) => void dropBody(e.target.files)}
                />
              </div>
              <label className={styles.field} style={{ marginBottom: 8 }}>
                Description des prochaines images (aide le référencement et l&apos;accessibilité)
                <input
                  value={imgAlt}
                  onChange={(e) => setImgAlt(e.target.value)}
                  placeholder="Ex. : voyageur au lever du soleil dans un aéroport"
                />
              </label>
              <div
                className={styles.field}
                data-over={over === 'body'}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOver('body');
                }}
                onDragLeave={() => setOver(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setOver(null);
                  void dropBody(e.dataTransfer.files);
                }}
              >
                <textarea
                  ref={area}
                  value={p.bodyMd}
                  style={{
                    minHeight: 380,
                    outline: over === 'body' ? '3px dashed var(--sky)' : undefined,
                  }}
                  onChange={(e) => set('bodyMd', e.target.value)}
                  placeholder={
                    "Écrivez ici. Glissez-déposez une image pour l'insérer.\n\n## Un intertitre\n\nUn paragraphe avec du **gras**."
                  }
                  aria-label="Contenu de l'article"
                />
              </div>
            </>
          )}
        </section>
      </div>

      <aside className={styles.stack}>
        <section className={styles.card}>
          <div className={styles.stack}>
            <div className={styles.toolbar}>
              <button
                type="button"
                className={styles.btn}
                disabled={pending || busy || p.title.length < 3}
                onClick={() => save('published')}
              >
                <Send size={16} /> {p.status === 'published' ? 'Mettre à jour' : 'Publier'}
              </button>
              <button
                type="button"
                className={styles.btnGhost}
                disabled={pending || busy || p.title.length < 3}
                onClick={() => save('draft')}
              >
                <Save size={16} /> {p.status === 'published' ? 'Dépublier' : 'Brouillon'}
              </button>
            </div>
            <p className={styles.status} style={{ margin: 0 }}>
              État :{' '}
              <span
                className={`${styles.pill} ${p.status === 'published' ? styles.ok : styles.warn}`}
              >
                {p.status === 'published' ? 'Publié' : 'Brouillon'}
              </span>
            </p>
            {msg ? (
              <p
                role={msg.ok ? 'status' : 'alert'}
                className={msg.ok ? undefined : styles.err}
                style={{ margin: 0, fontWeight: 700, color: msg.ok ? '#0f6b43' : undefined }}
              >
                {msg.text}
              </p>
            ) : null}
            {busy ? (
              <p role="status" style={{ margin: 0 }}>
                Conversion de l&apos;image en WebP…
              </p>
            ) : null}
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.stack}>
            <b>
              Image de couverture{' '}
              <Info
                title="Image de couverture"
                example="Une photo de 3 Mo devient environ 250 Ko, nommée « mon-titre-couverture.webp »."
              >
                Déposez une image : elle est automatiquement réduite, convertie en WebP (format
                léger qui accélère le site) et renommée avec le titre de l&apos;article, ce qui aide
                le référencement dans Google Images.
              </Info>
            </b>
            {p.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className={styles.cover} src={p.coverUrl} alt={p.coverAlt} />
            ) : null}
            <div
              className={styles.drop}
              data-over={over === 'cover'}
              role="button"
              tabIndex={0}
              onClick={() => document.getElementById('cover-file')?.click()}
              onKeyDown={(e) =>
                (e.key === 'Enter' || e.key === ' ') &&
                document.getElementById('cover-file')?.click()
              }
              onDragOver={(e) => {
                e.preventDefault();
                setOver('cover');
              }}
              onDragLeave={() => setOver(null)}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                void dropCover(e.dataTransfer.files);
              }}
            >
              <UploadCloud size={26} aria-hidden="true" />
              Glissez une image ici ou cliquez pour choisir
              <small style={{ fontWeight: 500 }}>JPEG, PNG, WebP, AVIF · 12 Mo max</small>
            </div>
            <input
              id="cover-file"
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => void dropCover(e.target.files)}
            />
            <label className={styles.field}>
              Description de l&apos;image
              <input
                value={p.coverAlt}
                maxLength={200}
                onChange={(e) => set('coverAlt', e.target.value)}
                placeholder="Ex. : lever de soleil vu d'un hublot"
              />
            </label>
            {p.coverUrl ? (
              <button
                type="button"
                className={styles.btnGhost}
                onClick={() => set('coverUrl', null)}
              >
                Retirer l&apos;image
              </button>
            ) : null}
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.stack}>
            <div className={styles.row2}>
              <label className={styles.field}>
                Thème
                <input
                  list="topics"
                  value={p.topic}
                  maxLength={60}
                  onChange={(e) => set('topic', e.target.value)}
                />
                <datalist id="topics">
                  {topics.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </label>
              <label className={styles.field}>
                Langue
                <select
                  value={p.locale}
                  onChange={(e) => set('locale', e.target.value as EditorPost['locale'])}
                >
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                </select>
              </label>
            </div>
            <label className={styles.field}>
              Titre pour Google (optionnel)
              <input
                value={p.seoTitle}
                maxLength={120}
                onChange={(e) => set('seoTitle', e.target.value)}
                placeholder={p.title}
              />
            </label>
            <label className={styles.field}>
              Description pour Google (optionnel)
              <textarea
                value={p.seoDescription}
                maxLength={200}
                style={{ minHeight: 80 }}
                onChange={(e) => set('seoDescription', e.target.value)}
                placeholder={p.excerpt}
              />
            </label>
          </div>
        </section>

        <section className={styles.card}>
          <b>
            Aide au référencement ({score}/{checks.length}){' '}
            <Info
              title="Aide au référencement"
              example="Un article de 600 mots, avec des intertitres et une image décrite, a plus de chances d'être bien classé."
            >
              Quelques contrôles simples pour que Google comprenne et valorise l&apos;article. Rien
              n&apos;est bloquant : ce sont des conseils.
            </Info>
          </b>
          <ul className={styles.bars} style={{ marginTop: 10 }}>
            {checks.map(([ok, text]) => (
              <li key={text} style={{ display: 'flex', gap: 8, fontSize: 13.5, fontWeight: 600 }}>
                <span aria-hidden="true">{ok ? '✅' : '⬜'}</span>
                <span>
                  <span className={styles.sr}>{ok ? 'Fait : ' : 'À faire : '}</span>
                  {text}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {p.id ? (
          <section className={styles.card}>
            {confirmDelete ? (
              <div className={styles.stack}>
                <p style={{ margin: 0, fontWeight: 700 }}>
                  Supprimer définitivement cet article et ses images ?
                </p>
                <div className={styles.toolbar}>
                  <button
                    type="button"
                    className={styles.btnDanger}
                    disabled={pending}
                    onClick={remove}
                  >
                    <Trash2 size={16} /> Oui, supprimer
                  </button>
                  <button
                    type="button"
                    className={styles.btnGhost}
                    onClick={() => setConfirmDelete(false)}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.toolbar}>
                <button
                  type="button"
                  className={styles.btnDanger}
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 size={16} /> Supprimer l&apos;article
                </button>
                {p.status === 'published' ? (
                  <Link
                    className={styles.btnGhost}
                    href={`${p.locale === 'fr' ? '' : `/${p.locale}`}/blog/${p.slug}`}
                    target="_blank"
                  >
                    Voir sur le site
                  </Link>
                ) : null}
              </div>
            )}
          </section>
        ) : null}
      </aside>
    </div>
  );
}

/** Aperçu simplifié : mêmes règles de lecture que le site (HTML neutralisé). */
function Preview({ md }: { md: string }) {
  const blocks = parseMarkdown(md);
  if (!blocks.length)
    return <div className={styles.empty}>Rien à afficher pour l&apos;instant.</div>;
  return (
    <div style={{ lineHeight: 1.7 }}>
      {blocks.map((b, i) => {
        if (b.type === 'h')
          return b.level === 2 ? (
            <h2 key={i} dangerouslySetInnerHTML={{ __html: b.text }} />
          ) : (
            <h3 key={i} dangerouslySetInnerHTML={{ __html: b.text }} />
          );
        if (b.type === 'p') return <p key={i} dangerouslySetInnerHTML={{ __html: b.text }} />;
        if (b.type === 'img')
          // eslint-disable-next-line @next/next/no-img-element
          return (
            <img key={i} src={b.src} alt={b.alt} style={{ maxWidth: '100%', borderRadius: 12 }} />
          );
        if (b.type === 'list') {
          const Tag = b.ordered ? 'ol' : 'ul';
          return (
            <Tag key={i}>
              {b.items.map((t, j) => (
                <li key={j} dangerouslySetInnerHTML={{ __html: t }} />
              ))}
            </Tag>
          );
        }
        return null;
      })}
    </div>
  );
}
