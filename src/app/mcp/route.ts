import { NextResponse } from 'next/server';
import { handleBody } from '@/lib/mcp/server';
import { rateLimit } from '@/lib/rate-limit';

/**
 * Serveur MCP public de Fuseo (Streamable HTTP, sans état, lecture seule) : https://fuseo.net/mcp
 * Les assistants IA et les agents peuvent lire les articles, trouver un aéroport et calculer un décalage horaire.
 */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Mcp-Protocol-Version, Mcp-Session-Id',
  'Access-Control-Max-Age': '86400',
};

export async function POST(req: Request) {
  if (!(await rateLimit(req, 'mcp', 60, 60))) {
    return NextResponse.json(
      { jsonrpc: '2.0', id: null, error: { code: -32000, message: 'Trop de requêtes' } },
      { status: 429, headers: CORS },
    );
  }
  const text = await req.text();
  if (text.length > 16_000) {
    return NextResponse.json(
      { jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Requête trop volumineuse' } },
      { status: 413, headers: CORS },
    );
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return NextResponse.json(
      { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'JSON invalide' } },
      { status: 400, headers: CORS },
    );
  }
  const { status, body } = await handleBody(json);
  return status === 202
    ? new NextResponse(null, { status, headers: CORS })
    : NextResponse.json(body, { status, headers: { ...CORS, 'Cache-Control': 'no-store' } });
}

// Pas de flux serveur (SSE) : la spécification demande alors une réponse 405 au GET.
export function GET() {
  return new NextResponse(
    'Serveur MCP Fuseo : envoyez vos requêtes JSON-RPC en POST. Voir https://fuseo.net/llms.txt',
    {
      status: 405,
      headers: { ...CORS, Allow: 'POST, OPTIONS', 'Content-Type': 'text/plain; charset=utf-8' },
    },
  );
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
