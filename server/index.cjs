/* Postgres-backed API for planner data (KV-style) */
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Lightweight .env.local loader so the API can pick up PG settings without extra deps.
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const raw = fs.readFileSync(envPath, 'utf8');
  raw
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .forEach(line => {
      const [k, ...rest] = line.split('=');
      const key = k?.trim();
      if (!key) return;
      const value = rest.join('=').trim();
      if (!process.env[key]) process.env[key] = value;
    });
}

const app = express();
const PORT = process.env.PORT || 3000;

const connectionString =
  process.env.PG_CONNECTION_STRING ||
  'postgres://postgres:postgres@localhost:5432/planner';

const pool = new Pool({
  connectionString,
  ssl:
    process.env.PGSSL === 'true'
      ? { rejectUnauthorized: false }
      : undefined
});

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS kv (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

app.use(cors());
app.use(express.json({ limit: '5mb' }));

const safeParse = raw => raw;

const normalizeValue = raw => {
  let val = raw;

  // Try to parse up to 3 times to unwrap nested/double-stringified JSON
  for (let i = 0; i < 3; i++) {
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (
        (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
        (trimmed.startsWith('"') && trimmed.endsWith('"'))
      ) {
        try {
          val = JSON.parse(trimmed);
          continue;
        } catch {
          // try again after unescaping common \" patterns or wrapping loose objects
          try {
            const unescaped = trimmed.replace(/\\"/g, '"');
            // handle multiple objects without array wrapper: {} , {}
            if (/}\s*,\s*{/.test(unescaped) && !unescaped.trim().startsWith('[')) {
              val = JSON.parse(`[${unescaped}]`);
            } else {
              val = JSON.parse(unescaped);
            }
            continue;
          } catch {
            // fall through
          }
        }
      }
    }
    break;
  }

  // If it's still a string, keep it as a JSON string (safe for JSONB)
  if (typeof val === 'string') {
    return val;
  }
  return val;
};

const upsertKV = async (client, key, value) => {
  // Always send JSON text and cast to JSONB to avoid invalid-json inserts.
  let jsonValue;
  try {
    jsonValue = JSON.stringify(value ?? null);
  } catch {
    jsonValue = JSON.stringify(String(value));
  }

  await client.query(
    `
      INSERT INTO kv (key, value)
      VALUES ($1, $2::jsonb)
      ON CONFLICT (key) DO UPDATE
        SET value = EXCLUDED.value,
            updated_at = now();
    `,
    [key, jsonValue]
  );
};

app.get('/api/ping', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/kv/:key', async (req, res) => {
  const { key } = req.params;
  const result = await pool.query(
    'SELECT key, value, updated_at FROM kv WHERE key = $1',
    [key]
  );
  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'not-found' });
  }
  const row = result.rows[0];
  res.json({
    key: row.key,
    value: safeParse(row.value),
    updatedAt: row.updated_at
  });
});

app.put('/api/kv/:key', async (req, res) => {
  const { key } = req.params;
  const value = normalizeValue(req.body?.value ?? null);
  try {
    const client = await pool.connect();
    try {
      await upsertKV(client, key, value);
    } finally {
      client.release();
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to upsert kv', key, err);
    res.status(400).json({ error: 'invalid-json' });
  }
});

app.delete('/api/kv/:key', async (req, res) => {
  const { key } = req.params;
  await pool.query('DELETE FROM kv WHERE key = $1', [key]);
  res.json({ ok: true });
});

app.get('/api/state', async (req, res) => {
  const keysParam = req.query.keys;
  let rows;
  if (keysParam) {
    const keys = String(keysParam)
      .split(',')
      .map(k => k.trim())
      .filter(Boolean);
    if (keys.length === 0) return res.json({ data: {} });
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(',');
    const result = await pool.query(
      `SELECT key, value FROM kv WHERE key IN (${placeholders})`,
      keys
    );
    rows = result.rows;
  } else {
    const result = await pool.query('SELECT key, value FROM kv');
    rows = result.rows;
  }
  const data = {};
  rows.forEach(r => {
    data[r.key] = safeParse(r.value);
  });
  res.json({ data });
});

app.post('/api/state', async (req, res) => {
  const payload = req.body?.data || {};
  const entries = Object.entries(payload).map(([k, v]) => [k, normalizeValue(v ?? null)]);
  if (entries.length === 0) return res.json({ ok: true, saved: 0 });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const [key, value] of entries) {
      await upsertKV(client, key, value);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to upsert bulk state', err);
    return res.status(400).json({ error: 'invalid-json' });
  } finally {
    client.release();
  }

  res.json({ ok: true, saved: entries.length });
});

// Safety net: never crash the process on handler errors
app.use((err, _req, res, _next) => {
  console.error('Unhandled error', err);
  res.status(500).json({ error: 'server-error' });
});

init()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Postgres API running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to init DB', err);
    process.exit(1);
  });
