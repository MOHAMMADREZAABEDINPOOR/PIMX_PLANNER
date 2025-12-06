export interface Env {
  DB: D1Database;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });

const parseValue = (raw: unknown) => {
  // Store as stringified JSON; parse back if possible.
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  return raw;
};

const stringifyValue = (raw: unknown) => {
  try {
    return JSON.stringify(raw ?? null);
  } catch {
    return String(raw ?? '');
  }
};

export const onRequestOptions: PagesFunction<Env> = () =>
  new Response('ok', { headers: corsHeaders });

export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const key = String(params.key);
  const result = await env.DB.prepare(
    'SELECT key, value, updated_at FROM kv WHERE key = ?'
  ).bind(key).first<{ key: string; value: string; updated_at: string }>();

  if (!result) return jsonResponse({ error: 'not-found' }, 404);

  return jsonResponse({
    key: result.key,
    value: parseValue(result.value),
    updatedAt: result.updated_at
  });
};

export const onRequestPut: PagesFunction<Env> = async ({ request, params, env }) => {
  const key = String(params.key);
  const body = await request.json().catch(() => ({}));
  const value = stringifyValue(body?.value ?? null);

  try {
    await env.DB.prepare(
      `INSERT INTO kv (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP`
    ).bind(key, value).run();
    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ error: 'invalid-json', detail: String(err) }, 400);
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ params, env }) => {
  const key = String(params.key);
  await env.DB.prepare('DELETE FROM kv WHERE key = ?').bind(key).run();
  return jsonResponse({ ok: true });
};
