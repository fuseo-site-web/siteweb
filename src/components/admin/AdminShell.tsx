import { ExternalLink, Lock } from 'lucide-react';
import { lockAdmin } from '@/app/admin/actions';
import { FuseoMark } from '@/components/brand/FuseoMark';
import { MobileFrame } from './MobileFrame';
import styles from './Admin.module.css';

/** Coque de l'administration : barre latérale à gauche, contenu à droite. */
export function AdminShell({
  email,
  badges,
  children,
}: {
  email: string;
  badges: { demandes: number; leads: number };
  children: React.ReactNode;
}) {
  return (
    <MobileFrame
      badges={badges}
      brand={
        <span className={styles.brand}>
          <FuseoMark size={32} />
          <b>fuseo</b>
          <small>Admin</small>
        </span>
      }
      footer={
        <div className={styles.sideFoot}>
          <span className={styles.who}>{email}</span>
          <a className={styles.sideBtn} href="/" target="_blank" rel="noopener">
            <ExternalLink size={15} aria-hidden="true" /> Voir le site
          </a>
          <form action={lockAdmin}>
            <button type="submit" className={styles.sideBtn} style={{ width: '100%' }}>
              <Lock size={15} aria-hidden="true" /> Verrouiller
            </button>
          </form>
        </div>
      }
    >
      {children}
    </MobileFrame>
  );
}
