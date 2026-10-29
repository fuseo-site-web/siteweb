import 'server-only';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { env } from '@/env';

/**
 * Chiffrement applicatif des données de santé : AES-256-GCM.
 * Format : v1.<key_id>.<iv>.<tag>.<texte chiffré> (base64url). L'identifiant de clé permet la rotation.
 */
function key(): Buffer {
  if (!env.HEALTH_ENCRYPTION_KEY) throw new Error('HEALTH_ENCRYPTION_KEY manquante');
  const k = Buffer.from(env.HEALTH_ENCRYPTION_KEY, 'base64');
  if (k.length !== 32) throw new Error('HEALTH_ENCRYPTION_KEY doit faire 32 octets (base64)');
  return k;
}

export const currentKeyId = () => env.HEALTH_ENCRYPTION_KEY_ID;

export function encryptJson(value: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return [
    'v1',
    currentKeyId(),
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    data.toString('base64url'),
  ].join('.');
}

export function decryptJson<T>(payload: string): T {
  const [version, keyId, iv, tag, data] = payload.split('.');
  if (version !== 'v1' || !keyId || !iv || !tag || !data)
    throw new Error('format chiffré invalide');
  if (keyId !== currentKeyId()) throw new Error('clé de chiffrement inconnue (rotation à traiter)');
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  const out = Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]);
  return JSON.parse(out.toString('utf8')) as T;
}
