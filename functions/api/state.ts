export interface Env {
  DB: D1Database;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });

const parseValue = (raw: string) => {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
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

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const keysParam = url.searchParams.get('keys');
  let rows: { key: string; value: string }[] = [];

  if (keysParam) {
    const keys = keysParam
      .split(',')
      .map(k => k.trim())
      .filter(Boolean);
    if (keys.length === 0) return jsonResponse({ data: {} });

    const placeholders = keys.map(() => '?').join(',');
    rows = await env.DB.prepare(
      `SELECT key, value FROM kv WHERE key IN (${placeholders})`
    ).bind(...keys).all<{ key: string; value: string }>().then(r => r.results ?? []);
  } else {
    rows = await env.DB.prepare('SELECT key, value FROM kv')
      .all<{ key: string; value: string }>()
      .then(r => r.results ?? []);
  }

  const data: Record<string, unknown> = {};
  rows.forEach(r => {
    data[r.key] = parseValue(r.value);
  });

  return jsonResponse({ data });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await request.json().catch(() => ({}));
  const entries = Object.entries(body?.data || {}).map(([k, v]) => [
    k,
    stringifyValue(v ?? null)
  ]);
  if (entries.length === 0) return jsonResponse({ ok: true, saved: 0 });

  const db = env.DB;
  const tx = db.batch(
    entries.map(([key, value]) =>
      db.prepare(
        `INSERT INTO kv (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP`
      ).bind(key, value)
    )
  );

  try {
    await tx;
    return jsonResponse({ ok: true, saved: entries.length });
  } catch (err) {
    return jsonResponse({ error: 'invalid-json', detail: String(err) }, 400);
  }
};
