import { z } from 'zod';
import { TOOLS, toolByName } from './tools';

/** Serveur MCP (Model Context Protocol) sans état, en HTTP : JSON-RPC 2.0 sur POST. Lecture seule. */

export const SUPPORTED = ['2025-06-18', '2025-03-26', '2024-11-05'];

interface Req {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

const ok = (id: Req['id'], result: unknown) => ({ jsonrpc: '2.0', id: id ?? null, result });
const fail = (id: Req['id'], code: number, message: string) => ({
  jsonrpc: '2.0',
  id: id ?? null,
  error: { code, message },
});

const jsonSchema = (s: z.ZodType) => {
  const schema = z.toJSONSchema(s, { io: 'input' }) as Record<string, unknown>;
  delete schema.$schema;
  return schema;
};

export async function handle(req: Req): Promise<object | null> {
  const { id, method, params } = req;
  // Notifications (sans identifiant) : rien à répondre.
  if (id === undefined) return null;

  switch (method) {
    case 'initialize': {
      const asked = typeof params?.protocolVersion === 'string' ? params.protocolVersion : '';
      return ok(id, {
        protocolVersion: SUPPORTED.includes(asked) ? asked : SUPPORTED[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'fuseo', title: 'Fuseo', version: '1.0.0' },
        instructions:
          'Fuseo : plan anti-jet lag personnalisé. Outils en lecture seule : présentation du site, articles du blog, aéroports et décalage horaire d’un trajet. Aucun conseil médical individuel.',
      });
    }
    case 'ping':
      return ok(id, {});
    case 'tools/list':
      return ok(id, {
        tools: TOOLS.map((t) => ({
          name: t.name,
          title: t.title,
          description: t.description,
          inputSchema: jsonSchema(t.schema),
          annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: false,
          },
        })),
      });
    case 'tools/call': {
      const t = typeof params?.name === 'string' ? toolByName(params.name) : undefined;
      if (!t) return fail(id, -32602, `Outil inconnu : ${String(params?.name)}`);
      const parsed = t.schema.safeParse(params?.arguments ?? {});
      if (!parsed.success) {
        return ok(id, {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Arguments invalides : ${parsed.error.issues.map((i) => `${i.path.join('.') || 'arguments'} (${i.message})`).join(' ; ')}`,
            },
          ],
        });
      }
      try {
        return ok(id, { content: [{ type: 'text', text: await t.run(parsed.data) }] });
      } catch {
        return ok(id, {
          isError: true,
          content: [{ type: 'text', text: 'Erreur interne, réessayez.' }],
        });
      }
    }
    default:
      return fail(id, -32601, `Méthode inconnue : ${method}`);
  }
}

const reqSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number(), z.null()]).optional(),
  method: z.string().max(100),
  params: z.record(z.string(), z.unknown()).optional(),
});

export async function handleBody(
  body: unknown,
): Promise<{ status: number; body: object | object[] | null }> {
  const list = Array.isArray(body) ? body : [body];
  if (!list.length || list.length > 10)
    return { status: 400, body: fail(null, -32600, 'Requête invalide') };
  const out: object[] = [];
  for (const item of list) {
    const p = reqSchema.safeParse(item);
    if (!p.success) return { status: 400, body: fail(null, -32600, 'Requête invalide') };
    const r = await handle(p.data as Req);
    if (r) out.push(r);
  }
  if (!out.length) return { status: 202, body: null };
  return { status: 200, body: Array.isArray(body) ? out : out[0]! };
}
