import { describe, expect, it } from 'vitest';
import { buildContactAck, buildContactAdmin, type ContactInput } from '@/lib/email/contact';

const base: ContactInput = {
  kind: 'contact',
  name: 'Camille Durand',
  email: 'camille@example.com',
  phone: '+33 6 12 34 56 78',
  slot: null,
  subject: 'Question sur mon vol Paris–Tokyo',
  message: 'Bonjour,\nJe vole la semaine prochaine.\nMerci !',
  locale: 'fr',
};

describe('accusé de réception au visiteur', () => {
  it('remercie dans la langue du visiteur, avec l’identité Fuseo', () => {
    const fr = buildContactAck(base);
    expect(fr.subject).toBe('Merci de nous avoir contactés');
    expect(fr.html).toContain('Bonjour Camille,');
    expect(fr.html).toContain('revenir vers vous dans les plus brefs délais');
    expect(fr.html).toContain('https://fuseo.net/images/email/fuseo-logo.png');
    expect(fr.html).toContain('#ffc857');
    expect(fr.text).toContain('Je vole la semaine prochaine.');
    expect(buildContactAck({ ...base, locale: 'en' }).subject).toBe('Thank you for contacting us');
    expect(buildContactAck({ ...base, locale: 'es' }).html).toContain('Hola Camille,');
  });

  it('rappelle le créneau d’un rendez-vous, et seulement pour un rendez-vous', () => {
    expect(buildContactAck({ ...base, kind: 'rdv', slot: 'mardi après-midi' }).html).toContain(
      'mardi après-midi',
    );
    expect(
      buildContactAck({ ...base, kind: 'contact', slot: 'mardi après-midi' }).html,
    ).not.toContain('mardi après-midi');
  });

  it('ne laisse passer aucun HTML saisi par le visiteur et n’ajoute pas de désinscription', () => {
    const m = buildContactAck({
      ...base,
      name: '<script>alert(1)</script>',
      message: '<img src=x onerror=alert(1)>',
      subject: '<b>x</b>',
    });
    expect(m.html).not.toContain('<script>alert');
    expect(m.html).not.toContain('<img src=x');
    expect(m.html).toContain('&lt;img src=x');
    expect(m.html).not.toContain('api/unsubscribe');
  });
});

describe('notification à l’administrateur', () => {
  const at = new Date('2026-10-30T10:30:00Z');

  it('dit qui, pourquoi et comment répondre', () => {
    const m = buildContactAdmin(base, at);
    expect(m.subject).toBe('[Fuseo] Question : Camille Durand · Question sur mon vol Paris–Tokyo');
    expect(m.html).toContain('href="mailto:camille@example.com"');
    expect(m.html).toContain('href="tel:+33612345678"');
    expect(m.html).toContain('Je vole la semaine prochaine.');
    expect(m.html).toContain('vendredi 30 octobre 2026');
    expect(m.html).toContain('https://fuseo.net/admin/demandes');
    expect(m.text).toContain('E-mail : camille@example.com');
  });

  it('oriente vers « Leads » pour un rendez-vous ou Fuseo Pro, avec le créneau', () => {
    const m = buildContactAdmin({ ...base, kind: 'rdv', slot: 'mardi après-midi' }, at);
    expect(m.subject).toContain('Demande de rendez-vous');
    expect(m.html).toContain('mardi après-midi');
    expect(m.html).toContain('https://fuseo.net/admin/leads');
    expect(buildContactAdmin({ ...base, kind: 'pro' }, at).html).toContain('/admin/leads');
  });

  it('neutralise le HTML et les retours à la ligne dans l’objet et le nom', () => {
    const m = buildContactAdmin(
      { ...base, name: 'A\nB', subject: 'Obj\r\nBcc: x@y.z', message: '<b>x</b>' },
      at,
    );
    expect(m.subject).not.toMatch(/[\r\n]/);
    expect(m.html).toContain('&lt;b&gt;x&lt;/b&gt;');
  });
});
