'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  ADMIN_COOKIE,
  SESSION_MAX_AGE,
  checkAdminCode,
  codeAttemptAllowed,
  getAdminUser,
  logAdmin,
  signAdminSession,
} from '@/lib/admin/access';

export type GateState = { error: string } | null;

/** Ouvre l'espace administrateur : compte autorisé + bon code, puis session signée de 2 heures. */
export async function unlockAdmin(_prev: GateState, formData: FormData): Promise<GateState> {
  const user = await getAdminUser();
  if (!user) return { error: 'Accès refusé.' };
  if (!(await codeAttemptAllowed())) {
    return { error: 'Trop de tentatives. Patientez 15 minutes avant de réessayer.' };
  }
  const code = String(formData.get('code') ?? '').slice(0, 100);
  if (!checkAdminCode(code)) {
    await logAdmin(user.id, 'admin.code_failed');
    return { error: 'Code incorrect.' };
  }
  (await cookies()).set(ADMIN_COOKIE, signAdminSession(user.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  await logAdmin(user.id, 'admin.unlocked');
  redirect('/admin');
}

export async function lockAdmin() {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect('/');
}
