import { describe, test, expect } from 'vitest';
import { computeDaily, computeOverall, computeMatchup, computeTournament } from './scoring';

describe('computeDaily', () => {
  test('R1: Kyle 68, Tommy 71 → Kyle wins', () => {
    const r = computeDaily(1, 68, 71, true, true);
    expect(r.winner).toBe('kyle');
  });

  test('R1: tie 70-70 → void', () => {
    const r = computeDaily(1, 70, 70, true, true);
    expect(r.winner).toBe('void');
  });

  test('R3: Kyle made cut, Tommy missed → Kyle wins automatically', () => {
    const r = computeDaily(3, 68, null, true, false);
    expect(r.winner).toBe('kyle');
  });

  test('R3: both missed cut → void', () => {
    const r = computeDaily(3, null, null, false, false);
    expect(r.winner).toBe('void');
  });

  test('R4: Kyle made cut and shot 70, Tommy made cut and shot 65 → Tommy wins', () => {
    const r = computeDaily(4, 70, 65, true, true);
    expect(r.winner).toBe('tommy');
  });
});

describe('computeOverall', () => {
  test('Both made cut, Kyle 282 vs Tommy 280 → Tommy wins', () => {
    const kyle = { dg_id: 1, player_name: 'K', rounds: [70, 71, 70, 71] as any, made_cut: true, total_score: 282 };
    const tommy = { dg_id: 2, player_name: 'T', rounds: [70, 70, 70, 70] as any, made_cut: true, total_score: 280 };
    const r = computeOverall(kyle, tommy);
    expect(r.winner).toBe('tommy');
  });

  test('Kyle made cut, Tommy missed → Kyle wins', () => {
    const kyle = { dg_id: 1, player_name: 'K', rounds: [70, 71, 70, 71] as any, made_cut: true, total_score: 282 };
    const tommy = { dg_id: 2, player_name: 'T', rounds: [80, 80, null, null] as any, made_cut: false, total_score: null };
    const r = computeOverall(kyle, tommy);
    expect(r.winner).toBe('kyle');
  });

  test('Neither made cut → void', () => {
    const kyle = { dg_id: 1, player_name: 'K', rounds: [80, 80, null, null] as any, made_cut: false, total_score: null };
    const tommy = { dg_id: 2, player_name: 'T', rounds: [80, 80, null, null] as any, made_cut: false, total_score: null };
    const r = computeOverall(kyle, tommy);
    expect(r.winner).toBe('void');
  });
});

describe('computeMatchup', () => {
  test('Kyle dominates: wins all 4 rounds + overall → +$15', () => {
    const kyle = { dg_id: 1, player_name: 'K', rounds: [68, 68, 68, 68] as any, made_cut: true, total_score: 272 };
    const tommy = { dg_id: 2, player_name: 'T', rounds: [70, 70, 70, 70] as any, made_cut: true, total_score: 280 };
    const r = computeMatchup({ matchup_num: 1, kyle, tommy });
    expect(r.total_dollars_to_kyle).toBe(15);
  });

  test('Kyle made cut, Tommy missed cut after R2 — Kyle won R1 and R2 too → +$15', () => {
    const kyle = { dg_id: 1, player_name: 'K', rounds: [68, 70, 71, 70] as any, made_cut: true, total_score: 279 };
    const tommy = { dg_id: 2, player_name: 'T', rounds: [75, 76, null, null] as any, made_cut: false, total_score: null };
    const r = computeMatchup({ matchup_num: 1, kyle, tommy });
    expect(r.total_dollars_to_kyle).toBe(15);
  });

  test('Kyle lost R1 R2 then Tommy missed cut → +$3', () => {
    const kyle = { dg_id: 1, player_name: 'K', rounds: [75, 76, 71, 70] as any, made_cut: true, total_score: 292 };
    const tommy = { dg_id: 2, player_name: 'T', rounds: [65, 67, null, null] as any, made_cut: false, total_score: null };
    const r = computeMatchup({ matchup_num: 1, kyle, tommy });
    expect(r.total_dollars_to_kyle).toBe(3);
  });

  test('Both miss cut, Kyle won R1 and R2 → +$6', () => {
    const kyle = { dg_id: 1, player_name: 'K', rounds: [70, 71, null, null] as any, made_cut: false, total_score: null };
    const tommy = { dg_id: 2, player_name: 'T', rounds: [72, 73, null, null] as any, made_cut: false, total_score: null };
    const r = computeMatchup({ matchup_num: 1, kyle, tommy });
    expect(r.total_dollars_to_kyle).toBe(6);
  });
});

describe('computeTournament', () => {
  test('Full Kyle sweep → maximum ledger to Kyle ($140)', () => {
    const matchups = Array.from({ length: 6 }, (_, i) => ({
      matchup_num: i + 1,
      kyle: { dg_id: 100 + i, player_name: `K${i}`, rounds: [70, 70, 70, 70] as any, made_cut: true, total_score: 280 },
      tommy: { dg_id: 200 + i, player_name: `T${i}`, rounds: [75, 75, 75, 75] as any, made_cut: true, total_score: 300 },
    }));
    const r = computeTournament(matchups, 'K0', 100);
    expect(r.matchup_total_to_kyle).toBe(90);
    expect(r.low_score.dollars_to_kyle).toBe(25);
    expect(r.tournament_winner.dollars_to_kyle).toBe(25);
    expect(r.net_to_kyle).toBe(140);
  });

  test('Tournament winner not drafted → $0 for that bet', () => {
    const matchups = [{
      matchup_num: 1,
      kyle: { dg_id: 100, player_name: 'K', rounds: [70, 70, 70, 70] as any, made_cut: true, total_score: 280 },
      tommy: { dg_id: 200, player_name: 'T', rounds: [71, 71, 71, 71] as any, made_cut: true, total_score: 284 },
    }];
    const r = computeTournament(matchups, 'Someone Else', 999);
    expect(r.tournament_winner.dollars_to_kyle).toBe(0);
    expect(r.tournament_winner.was_drafted).toBe(false);
  });
});
