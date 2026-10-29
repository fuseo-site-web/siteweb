import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import { CodeGate } from '@/components/admin/CodeGate';
import { getAdminSession, getAdminUser } from '@/lib/admin/access';
import { getBadgeCounts } from '@/lib/admin/data';
import { getCurrentUser } from '@/lib/auth';
import '@/styles/globals.css';

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-montserrat',
});

export const metadata: Metadata = {
  title: 'Administration · Fuseo',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={montserrat.variable}>
      <body>
        <Suspense fallback={<div aria-busy="true" style={{ minHeight: '100dvh' }} />}>
          <Gate>{children}</Gate>
        </Suspense>
      </body>
    </html>
  );
}

/** Deux verrous : être connecté avec le compte administrateur, puis saisir le code. Sinon, la page « n'existe pas ». */
async function Gate({ children }: { children: React.ReactNode }) {
  const admin = await getAdminUser();
  if (!admin) {
    const { user } = await getCurrentUser();
    if (!user) redirect('/connexion?next=/admin');
    notFound();
  }
  if (!(await getAdminSession())) return <CodeGate />;
  const badges = await getBadgeCounts();
  return (
    <AdminShell email={admin.email ?? ''} badges={badges}>
      {children}
    </AdminShell>
  );
}
