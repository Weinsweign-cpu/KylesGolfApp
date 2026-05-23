import 'server-only';
import { createClient, type Client } from '@libsql/client';
import path from 'path';
import fs from 'fs';

function makeClient(): Client {
  const url = process.env.TURSO_DATABASE_URL
    ?? `file:${path.join(process.cwd(), 'data', 'kvt.db')}`;

  // Ensure local data dir exists when falling back to file-based SQLite
  if (!process.env.TURSO_DATABASE_URL) {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  }

  return createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
}

let _client: Client | null = null;
let _schemaReady: Promise<void> | null = null;

function getDb(): Client {
  if (!_client) _client = makeClient();
  return _client;
}

async function ensureSchema(): Promise<void> {
  if (_schemaReady) return _schemaReady;
  _schemaReady = (async () => {
    const client = getDb();
    await client.batch(
      [
        {
          sql: `CREATE TABLE IF NOT EXISTS kvt_tournaments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            dg_event_id INTEGER NOT NULL,
            year INTEGER NOT NULL,
            event_name TEXT NOT NULL,
            course TEXT,
            start_date TEXT,
            status TEXT NOT NULL DEFAULT 'active',
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            finalized_at TEXT,
            final_net_to_kyle REAL,
            final_results_json TEXT,
            UNIQUE(dg_event_id, year)
          )`,
          args: [],
        },
        {
          sql: `CREATE TABLE IF NOT EXISTS kvt_matchups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tournament_id INTEGER NOT NULL REFERENCES kvt_tournaments(id) ON DELETE CASCADE,
            matchup_num INTEGER NOT NULL CHECK (matchup_num BETWEEN 1 AND 6),
            kyle_dg_id INTEGER NOT NULL,
            kyle_player_name TEXT NOT NULL,
            tommy_dg_id INTEGER NOT NULL,
            tommy_player_name TEXT NOT NULL,
            UNIQUE(tournament_id, matchup_num)
          )`,
          args: [],
        },
        {
          sql: `CREATE INDEX IF NOT EXISTS idx_matchups_tournament ON kvt_matchups(tournament_id)`,
          args: [],
        },
      ],
      'write',
    );

    // Migration: add final_results_json to existing DBs (best effort)
    try {
      await client.execute('ALTER TABLE kvt_tournaments ADD COLUMN final_results_json TEXT');
    } catch { /* already exists */ }
  })();
  return _schemaReady;
}

export type KvtTournament = {
  id: number;
  dg_event_id: number;
  year: number;
  event_name: string;
  course: string | null;
  start_date: string | null;
  status: 'active' | 'finalized';
  created_at: string;
  finalized_at: string | null;
  final_net_to_kyle: number | null;
  final_results_json: string | null;
};

export type KvtMatchup = {
  id: number;
  tournament_id: number;
  matchup_num: number;
  kyle_dg_id: number;
  kyle_player_name: string;
  tommy_dg_id: number;
  tommy_player_name: string;
};

export async function createTournament(input: {
  dg_event_id: number;
  year: number;
  event_name: string;
  course?: string;
  start_date?: string;
  matchups: Array<{
    matchup_num: number;
    kyle_dg_id: number;
    kyle_player_name: string;
    tommy_dg_id: number;
    tommy_player_name: string;
  }>;
}): Promise<number> {
  await ensureSchema();
  const client = getDb();
  const tx = await client.transaction('write');
  try {
    const result = await tx.execute({
      sql: `INSERT INTO kvt_tournaments (dg_event_id, year, event_name, course, start_date)
            VALUES (?, ?, ?, ?, ?)`,
      args: [input.dg_event_id, input.year, input.event_name, input.course ?? null, input.start_date ?? null],
    });
    const tid = Number(result.lastInsertRowid);

    for (const m of input.matchups) {
      await tx.execute({
        sql: `INSERT INTO kvt_matchups (tournament_id, matchup_num, kyle_dg_id, kyle_player_name, tommy_dg_id, tommy_player_name)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [tid, m.matchup_num, m.kyle_dg_id, m.kyle_player_name, m.tommy_dg_id, m.tommy_player_name],
      });
    }

    await tx.commit();
    return tid;
  } catch (e) {
    await tx.rollback();
    throw e;
  }
}

export async function getTournaments(): Promise<KvtTournament[]> {
  await ensureSchema();
  const result = await getDb().execute('SELECT * FROM kvt_tournaments ORDER BY created_at DESC');
  return result.rows as unknown as KvtTournament[];
}

export async function getActiveTournament(): Promise<KvtTournament | null> {
  await ensureSchema();
  const result = await getDb().execute(
    `SELECT * FROM kvt_tournaments WHERE status = 'active' ORDER BY created_at DESC LIMIT 1`,
  );
  return (result.rows[0] ?? null) as unknown as KvtTournament | null;
}

export async function getTournamentById(id: number): Promise<KvtTournament | null> {
  await ensureSchema();
  const result = await getDb().execute({
    sql: 'SELECT * FROM kvt_tournaments WHERE id = ?',
    args: [id],
  });
  return (result.rows[0] ?? null) as unknown as KvtTournament | null;
}

export async function getKvtMatchups(tournamentId: number): Promise<KvtMatchup[]> {
  await ensureSchema();
  const result = await getDb().execute({
    sql: 'SELECT * FROM kvt_matchups WHERE tournament_id = ? ORDER BY matchup_num',
    args: [tournamentId],
  });
  return result.rows as unknown as KvtMatchup[];
}

export async function finalizeTournament(id: number, netToKyle: number, resultsJson?: string): Promise<void> {
  await ensureSchema();
  await getDb().execute({
    sql: `UPDATE kvt_tournaments SET status = 'finalized', finalized_at = datetime('now'), final_net_to_kyle = ?, final_results_json = ? WHERE id = ?`,
    args: [netToKyle, resultsJson ?? null, id],
  });
}

export async function deleteTournament(id: number): Promise<void> {
  await ensureSchema();
  await getDb().execute({ sql: 'DELETE FROM kvt_tournaments WHERE id = ?', args: [id] });
}

export async function updateMatchups(
  id: number,
  matchups: Array<{
    matchup_num: number;
    kyle_dg_id: number;
    kyle_player_name: string;
    tommy_dg_id: number;
    tommy_player_name: string;
  }>,
): Promise<void> {
  await ensureSchema();
  const client = getDb();
  const tx = await client.transaction('write');
  try {
    await tx.execute({ sql: 'DELETE FROM kvt_matchups WHERE tournament_id = ?', args: [id] });
    for (const m of matchups) {
      await tx.execute({
        sql: `INSERT INTO kvt_matchups (tournament_id, matchup_num, kyle_dg_id, kyle_player_name, tommy_dg_id, tommy_player_name)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [id, m.matchup_num, m.kyle_dg_id, m.kyle_player_name, m.tommy_dg_id, m.tommy_player_name],
      });
    }
    await tx.commit();
  } catch (e) {
    await tx.rollback();
    throw e;
  }
}

/** Used by the seed route to upsert a fully-finalized tournament in one transaction. */
export async function upsertFinalizedTournament(t: {
  dg_event_id: number;
  year: number;
  event_name: string;
  course: string;
  start_date: string;
  final_net_to_kyle: number;
  matchups: Array<{
    matchup_num: number;
    kyle_dg_id: number;
    kyle_player_name: string;
    tommy_dg_id: number;
    tommy_player_name: string;
  }>;
}): Promise<{ id: number; replaced: boolean }> {
  await ensureSchema();
  const client = getDb();
  const tx = await client.transaction('write');
  try {
    // Delete any existing row with the same dg_event_id + year (cascade-deletes matchups)
    const existing = await tx.execute({
      sql: 'SELECT id FROM kvt_tournaments WHERE dg_event_id = ? AND year = ?',
      args: [t.dg_event_id, t.year],
    });
    const replaced = existing.rows.length > 0;
    if (replaced) {
      await tx.execute({
        sql: 'DELETE FROM kvt_tournaments WHERE id = ?',
        args: [Number(existing.rows[0].id)],
      });
    }

    const row = await tx.execute({
      sql: `INSERT INTO kvt_tournaments (dg_event_id, year, event_name, course, start_date, status, finalized_at, final_net_to_kyle)
            VALUES (?, ?, ?, ?, ?, 'finalized', datetime('now'), ?)`,
      args: [t.dg_event_id, t.year, t.event_name, t.course, t.start_date, t.final_net_to_kyle],
    });
    const tid = Number(row.lastInsertRowid);

    for (const m of t.matchups) {
      await tx.execute({
        sql: `INSERT INTO kvt_matchups (tournament_id, matchup_num, kyle_dg_id, kyle_player_name, tommy_dg_id, tommy_player_name)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [tid, m.matchup_num, m.kyle_dg_id, m.kyle_player_name, m.tommy_dg_id, m.tommy_player_name],
      });
    }

    await tx.commit();
    return { id: tid, replaced };
  } catch (e) {
    await tx.rollback();
    throw e;
  }
}
