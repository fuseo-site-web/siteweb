import styles from '@/components/admin/Admin.module.css';

/**
 * Écran d'attente des pages de l'admin : affiché tout de suite pendant que les données du jour (statistiques,
 * clients, demandes…) sont lues. Il rend les navigations entre les pages de l'admin instantanées.
 */
export default function AdminLoading() {
  return (
    <div className={styles.loading} role="status" aria-live="polite">
      <span className={styles.srOnly}>Chargement…</span>
      <div className={styles.skelTitle} />
      <div className={styles.skelLine} />
      <div className={styles.skelGrid}>
        <div className={styles.skelCard} />
        <div className={styles.skelCard} />
        <div className={styles.skelCard} />
      </div>
      <div className={styles.skelBlock} />
    </div>
  );
}
