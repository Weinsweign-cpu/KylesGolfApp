import { config } from 'dotenv';
config({ path: '.env.local' });

import { getOutrights, getRecommendedParlay, type OutrightMarket } from '../src/lib/datagolf';

(async () => {
  const markets: OutrightMarket[] = ['win', 'top_5', 'top_10', 'top_20', 'make_cut', 'frl'];

  for (const m of markets) {
    console.log(`\n=== ${m.toUpperCase()} ===`);
    const data = await getOutrights(m);
    if ('error' in data) {
      console.log('ERROR:', data.error);
      continue;
    }
    console.log('Event:', data.event_name);
    console.log('Players:', data.picks.length);
    console.log(`+EV picks: ${data.positive_ev_count}`);

    console.log('Top 3 by EV:');
    data.picks.slice(0, 3).forEach(p => {
      const evStr = (p.best_ev * 100).toFixed(1);
      console.log(`  ${p.player_name} — DG ${(p.model_prob * 100).toFixed(1)}% · ${p.best_book} ${p.best_odds.toFixed(2)} · EV ${p.best_ev > 0 ? '+' : ''}${evStr}%`);
    });
  }

  const parlay = await getRecommendedParlay();
  console.log('\n=== RECOMMENDED PARLAY ===');
  if (!parlay) {
    console.log('No +EV parlay available right now.');
  } else {
    console.log(`Legs (${parlay.legs.length}):`);
    parlay.legs.forEach(l => {
      console.log(`  ${l.player_name} ${l.market} @ ${l.decimal_odds.toFixed(2)} (${l.book}) · Model ${(l.model_prob * 100).toFixed(1)}% · EV +${(l.individual_ev * 100).toFixed(1)}%`);
    });
    console.log(`Combined odds: ${parlay.combined_odds.toFixed(2)}`);
    console.log(`Combined model prob: ${(parlay.combined_model_prob * 100).toFixed(1)}%`);
    console.log(`Combined EV: ${(parlay.combined_ev * 100).toFixed(1)}%`);
  }
})();
