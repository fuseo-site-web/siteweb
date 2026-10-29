'use client';

import { KeyRound } from 'lucide-react';
import { useActionState } from 'react';
import { unlockAdmin, type GateState } from '@/app/admin/actions';
import { FuseoMark } from '@/components/brand/FuseoMark';
import styles from './Admin.module.css';

export function CodeGate() {
  const [state, action, pending] = useActionState<GateState, FormData>(unlockAdmin, null);
  return (
    <main className={styles.gate}>
      <form className={styles.gateCard} action={action}>
        <FuseoMark size={44} />
        <div>
          <h1>Espace administrateur</h1>
          <p>Compte reconnu. Saisissez le code d&apos;ouverture pour accéder au tableau de bord.</p>
        </div>
        <label className={styles.field}>
          Code d&apos;ouverture
          <input
            name="code"
            type="password"
            autoComplete="off"
            required
            autoFocus
            aria-describedby={state ? 'gate-err' : undefined}
          />
        </label>
        {state ? (
          <p id="gate-err" role="alert" className={styles.err}>
            {state.error}
          </p>
        ) : null}
        <button type="submit" className={styles.btn} disabled={pending}>
          <KeyRound size={17} aria-hidden="true" />
          {pending ? 'Vérification…' : 'Ouvrir'}
        </button>
      </form>
    </main>
  );
}
