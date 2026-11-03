import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/env', () => ({ env: {} }));

import { verifyStripeSignature } from '@/lib/billing/stripe';

const SECRET = 'whsec_test_secret';
const sign = (payload: string, t: number, secret = SECRET) =>
  `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${payload}`).digest('hex')}`;

describe('webhook Stripe : vérification de signature', () => {
  const now = 1_800_000_000_000;
  const t = now / 1000;
  const body = '{"type":"checkout.session.completed"}';

  it('accepte une signature valide et récente', () => {
    expect(verifyStripeSignature(body, sign(body, t), SECRET, now)).toBe(true);
  });

  it('refuse un corps modifié, une autre clé, un en-tête absent ou un horodatage trop ancien', () => {
    expect(verifyStripeSignature(body + ' ', sign(body, t), SECRET, now)).toBe(false);
    expect(verifyStripeSignature(body, sign(body, t, 'whsec_autre'), SECRET, now)).toBe(false);
    expect(verifyStripeSignature(body, null, SECRET, now)).toBe(false);
    expect(verifyStripeSignature(body, sign(body, t - 600), SECRET, now)).toBe(false);
  });
});
