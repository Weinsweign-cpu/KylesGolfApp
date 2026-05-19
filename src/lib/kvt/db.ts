import 'server-only';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'kvt.db');

const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let _db: Database.Database | null = null;

export function db(): Database.Database {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  _db.exec(`
    CREATE TABLE IF NOT EXISTS kvt_tournaments (
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
      UNIQUE(dg_event_id, year)
    );

    CREATE TABLE IF NOT EXISTS kvt_matchups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER NOT NULL REFERENCES kvt_tournaments(id) ON DELETE CASCADE,
      matchup_num INTEGER NOT NULL CHECK (matchup_num BETWEEN 1 AND 6),
      kyle_dg_id INTEGER NOT NULL,
      kyle_player_name TEXT NOT NULL,
      tommy_dg_id INTEGER NOT NULL,
      tommy_player_name TEXT NOT NULL,
      UNIQUE(tournament_id, matchup_num)
    );

    CREATE INDEX IF NOT EXISTS idx_matchups_tournament ON kvt_matchups(tournament_id);
  `);

  return _db;
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

export function createTournament(input: {
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
}): number {
  const conn = db();
  const tx = conn.transaction((data: typeof input) => {
    const result = conn.prepare(`
      INSERT INTO kvt_tournaments (dg_event_id, year, event_name, course, start_date)
      VALUES (?, ?, ?, ?, ?)
    `).run(data.dg_event_id, data.year, data.event_name, data.course ?? null, data.start_date ?? null);
    const tid = Number(result.lastInsertRowid);

    const mstmt = conn.prepare(`
      INSERT INTO kvt_matchups (tournament_id, matchup_num, kyle_dg_id, kyle_player_name, tommy_dg_id, tommy_player_name)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const m of data.matchups) {
      mstmt.run(tid, m.matchup_num, m.kyle_dg_id, m.kyle_player_name, m.tommy_dg_id, m.tommy_player_name);
    }
    return tid;
  });
  return tx(input);
}

export function getTournaments(): KvtTournament[] {
  return db().prepare('SELECT * FROM kvt_tournaments ORDER BY created_at DESC').all() as KvtTournament[];
}

export function getActiveTournament(): KvtTournament | null {
  return db().prepare(
    `SELECT * FROM kvt_tournaments WHERE status = 'active' ORDER BY created_at DESC LIMIT 1`
  ).get() as KvtTournament | null;
}

export function getTournamentById(id: number): KvtTournament | null {
  return db().prepare('SELECT * FROM kvt_tournaments WHERE id = ?').get(id) as KvtTournament | null;
}

export function getKvtMatchups(tournamentId: number): KvtMatchup[] {
  return db()
    .prepare('SELECT * FROM kvt_matchups WHERE tournament_id = ? ORDER BY matchup_num')
    .all(tournamentId) as KvtMatchup[];
}

export function finalizeTournament(id: number, netToKyle: number) {
  db().prepare(
    `UPDATE kvt_tournaments SET status = 'finalized', finalized_at = datetime('now'), final_net_to_kyle = ? WHERE id = ?`
  ).run(netToKyle, id);
}

export function deleteTournament(id: number) {
  db().prepare('DELETE FROM kvt_tournaments WHERE id = ?').run(id);
}

export function updateMatchups(id: number, matchups: Array<{
  matchup_num: number;
  kyle_dg_id: number;
  kyle_player_name: string;
  tommy_dg_id: number;
  tommy_player_name: string;
}>) {
  const conn = db();
  const tx = conn.transaction(() => {
    conn.prepare('DELETE FROM kvt_matchups WHERE tournament_id = ?').run(id);
    const stmt = conn.prepare(`
      INSERT INTO kvt_matchups (tournament_id, matchup_num, kyle_dg_id, kyle_player_name, tommy_dg_id, tommy_player_name)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const m of matchups) {
      stmt.run(id, m.matchup_num, m.kyle_dg_id, m.kyle_player_name, m.tommy_dg_id, m.tommy_player_name);
    }
  });
  tx();
}
