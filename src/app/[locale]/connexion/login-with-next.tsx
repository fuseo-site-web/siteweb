'use client';

import { useSearchParams } from 'next/navigation';
import { LoginForm } from '@/components/auth/LoginForm';

export function LoginWithNext() {
  const params = useSearchParams();
  const next = params.get('next') ?? undefined;
  return (
    <LoginForm next={next} initialMode={params.get('mode') === 'signup' ? 'signup' : 'login'} />
  );
}
