import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { rateLimitKey, sameOrigin } from '@/lib/rate-limit';
import { SUPPORT_REASONS } from '@/lib/support/reasons';
import { asLang, openTicket, preferredLang } from '@/lib/support/server';

const schema = z.object({
  reason: z.enum(SUPPORT_REASONS),
  message: z.string().trim().min(10).max(5000),
  locale: z.string().optional(),
});

/** Dossiers du client connecté, avec leurs messages (lecture protégée par la RLS). */
export async function GET() {
  const { supabase, user } = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'login' }, { status: 401 });
  const { data } = await supabase
    .from('support_tickets')
    .select(
      'id, ref, reason, status, unread_user, created_at, last_message_at, support_messages(id, author, body, created_at)',
    )
    .order('last_message_at', { ascending: false })
    .limit(30);
  return NextResponse.json(data ?? [], { headers: { 'Cache-Control': 'no-store' } });
}

/** Ouvre un dossier de support : renvoie son numéro de référence. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { user } = await getCurrentUser();
  if (!user?.email) return NextResponse.json({ error: 'login' }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 422 });
  if (!(await rateLimitKey('support-open', user.id, 5, 3600)))
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  const meta = user.user_metadata as Record<string, unknown>;
  const name =
    typeof meta.full_name === 'string'
      ? meta.full_name
      : typeof meta.name === 'string'
        ? meta.name
        : null;
  try {
    const ticket = await openTicket({
      userId: user.id,
      email: user.email,
      name,
      locale: await preferredLang(user.id, asLang(parsed.data.locale)),
      reason: parsed.data.reason,
      message: parsed.data.message,
    });
    return NextResponse.json({ ref: ticket.ref });
  } catch {
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
