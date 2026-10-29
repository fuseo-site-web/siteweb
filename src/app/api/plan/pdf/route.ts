import { NextResponse } from 'next/server';
import { planPdfResponse } from '@/lib/pdf/respond';
import { readPlanRequest } from '@/lib/plan-request';

export async function POST(req: Request) {
  const request = await readPlanRequest(req, 'plan-pdf');
  if ('error' in request) return request.error;
  try {
    return await planPdfResponse(request.input, new URL(req.url).searchParams.get('locale'));
  } catch {
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
