'use client';

import { useSearchParams } from 'next/navigation';
import { LoginForm } from '@/components/auth/LoginForm';

export function LoginWithNext() {
  const next = useSearchParams().get('next') ?? undefined;
  return <LoginForm next={next} />;
}
