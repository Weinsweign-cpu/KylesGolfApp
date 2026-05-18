type DGPlayer = {
  dg_id: number;
  player_name: string;
  win: number;
  top_5: number;
  top_10: number;
  top_20: number;
  make_cut: number;
};

type DGResponse = {
  event_name?: string;
  course?: string;
  last_updated?: string;
  baseline?: DGPlayer[];
  baseline_history_fit?: DGPlayer[];
};

function formatName(dgName: string): string {
  if (!dgName.includes(',')) return dgName;
  const [last, rest] = dgName.split(',', 2);
  return rest.trim() + ' ' + last.trim();
}

function pct(n: number | undefined): string {
  if (n == null || isNaN(n)) return '—';
  return (n * 100).toFixed(1) + '%';
}

async function fetchPredictions(): Promise<DGResponse | { error: string }> {
  const key = process.env.DATAGOLF_API_KEY;
  if (!key) return { error: 'DATAGOLF_API_KEY not set in .env.local' };

  const url = `https://feeds.datagolf.com/preds/pre-tournament?tour=pga&odds_format=percent&file_format=json&key=${key}`;

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return { error: 'DataGolf API returned ' + res.status };
    const data = await res.json();
    return data;
  } catch (e) {
    return { error: 'Fetch failed: ' + (e instanceof Error ? e.message : 'unknown') };
  }
}

export default async function PredictionsPage() {
  const data = await fetchPredictions();

  if ('error' in data) {
    return (
      <main style={{ padding: '40px', maxWidth: '900px' }}>
        <h1 className="font-display" style={{ fontSize: '32px', fontWeight: 600, marginBottom: '16px' }}>
          Predictions
        </h1>
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '24px',
        }}>
          <div className="font-mono" style={{ color: 'var(--negative)', fontSize: '12px', marginBottom: '8px' }}>
            ERROR
          </div>
          <div>{data.error}</div>
        </div>
      </main>
    );
  }

  const players = data.baseline_history_fit ?? data.baseline ?? [];
  const sorted = [...players].sort((a, b) => b.win - a.win);
  const winSum = sorted.reduce((s, p) => s + (p.win || 0), 0);

  return (
    <main style={{ padding: '40px', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <div className="font-mono" style={{
          fontSize: '11px',
          color: 'var(--text-tertiary)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: '6px',
        }}>
          DataGolf · PGA Tour
        </div>
        <h1 className="font-display" style={{
          fontSize: '40px',
          fontWeight: 600,
          letterSpacing: '-0.02em',
          margin: 0,
        }}>
          {data.event_name ?? 'No active event'}
        </h1>
        <div className="font-mono" style={{
          fontSize: '13px',
          color: 'var(--text-secondary)',
          marginTop: '6px',
        }}>
          {data.course ?? ''}{data.last_updated ? ' · Last updated ' + new Date(data.last_updated).toLocaleString() : ''}
        </div>
      </div>

      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead style={{ background: 'var(--bg-tertiary)' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', width: '50px' }}>#</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Player</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '11px', fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Win</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '11px', fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Top 5</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '11px', fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Top 10</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '11px', fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Top 20</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '11px', fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Make Cut</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p, i) => (
              <tr key={p.dg_id} style={{ borderTop: '1px solid var(--border)' }}>
                <td className="font-mono tabular" style={{ padding: '12px 16px', color: 'var(--text-tertiary)' }}>{i + 1}</td>
                <td style={{ padding: '12px 16px' }}>{formatName(p.player_name)}</td>
                <td className="font-mono tabular" style={{ padding: '12px 16px', textAlign: 'right' }}>{pct(p.win)}</td>
                <td className="font-mono tabular" style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-secondary)' }}>{pct(p.top_5)}</td>
                <td className="font-mono tabular" style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-secondary)' }}>{pct(p.top_10)}</td>
                <td className="font-mono tabular" style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-secondary)' }}>{pct(p.top_20)}</td>
                <td className="font-mono tabular" style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-secondary)' }}>{pct(p.make_cut)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="font-mono" style={{
        marginTop: '16px',
        fontSize: '11px',
        color: 'var(--text-tertiary)',
      }}>
        {sorted.length} players · Win % sum: {(winSum * 100).toFixed(1)}% (target ≈ 100%)
      </div>
    </main>
  );
}
