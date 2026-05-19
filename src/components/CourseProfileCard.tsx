'use client';

import type { CourseProfile } from '@/lib/datagolf';

type Props = {
  profile: CourseProfile | null;
  onPlayerClick: (dgId: number) => void;
};

function formatName(dgName: string): string {
  if (!dgName.includes(',')) return dgName;
  const [last, rest] = dgName.split(',', 2);
  return rest.trim() + ' ' + last.trim();
}

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  padding: '20px',
  marginBottom: '20px',
};

const subCardStyle: React.CSSProperties = {
  background: 'var(--bg-tertiary)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  padding: '14px',
};

const subLabelStyle: React.CSSProperties = {
  fontSize: '10px',
  color: 'var(--text-tertiary)',
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
  marginBottom: '10px',
};

export default function CourseProfileCard({ profile, onPlayerClick }: Props) {
  if (!profile) {
    return (
      <div style={cardStyle}>
        <div className="font-mono" style={{ fontSize: '10px', color: 'var(--text-tertiary)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '16px' }}>
          Course Profile
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[90, 70, 55, 40].map((w, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '100px', height: '12px', background: 'var(--bg-tertiary)', borderRadius: '3px' }} />
                <div style={{ flex: 1, height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', opacity: 0.5 }}>
                  <div style={{ height: '100%', background: 'var(--border)', borderRadius: '3px', width: `${w}%` }} />
                </div>
                <div style={{ width: '36px', height: '12px', background: 'var(--bg-tertiary)', borderRadius: '3px' }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[1, 2].map(i => (
              <div key={i} style={{ ...subCardStyle, flex: 1 }}>
                <div style={{ height: '10px', background: 'var(--border)', borderRadius: '2px', width: '60%', marginBottom: '10px' }} />
                {[1, 2, 3].map(j => (
                  <div key={j} style={{ height: '13px', background: 'var(--border)', borderRadius: '2px', marginBottom: '6px', opacity: 0.6 }} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const skills = [
    { key: 'ott', label: 'Off the Tee', weight: profile.skill_weights.ott },
    { key: 'app', label: 'Approach', weight: profile.skill_weights.app },
    { key: 'arg', label: 'Around Green', weight: profile.skill_weights.arg },
    { key: 'putt', label: 'Putting', weight: profile.skill_weights.putt },
  ].sort((a, b) => b.weight - a.weight);

  const topSkillName = skills[0].label.toLowerCase();

  const playerRow = (dg_id: number, name: string, valueStr: string) => (
    <div key={dg_id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <button
        onClick={() => onPlayerClick(dg_id)}
        style={{
          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'inherit',
          textAlign: 'left', flex: 1,
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--edge)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-primary)')}
      >
        {formatName(name)}
      </button>
      <span className="font-mono" style={{ fontSize: '11px', color: 'var(--positive)', whiteSpace: 'nowrap' }}>
        {valueStr}
      </span>
    </div>
  );

  return (
    <div style={cardStyle}>
      <div className="font-mono" style={{ fontSize: '10px', color: 'var(--text-tertiary)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '16px' }}>
        Course Profile
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Left: skill bars */}
        <div>
          <div className="font-mono" style={{ fontSize: '10px', color: 'var(--text-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '12px' }}>
            What this course rewards
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {skills.map(s => (
              <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '100px', fontSize: '12px', color: 'var(--text-secondary)' }}>{s.label}</div>
                <div style={{ flex: 1, height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: '3px', background: 'var(--edge)', width: `${(s.weight * 100).toFixed(0)}%`, transition: 'width 0.3s' }} />
                </div>
                <div className="font-mono" style={{ width: '36px', fontSize: '11px', color: 'var(--text-primary)', textAlign: 'right' }}>
                  {(s.weight * 100).toFixed(0)}%
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
            This course favors {topSkillName} players.
          </div>
        </div>

        {/* Right: best fits + history */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={subCardStyle}>
            <div className="font-mono" style={subLabelStyle}>Best Course Fits</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {profile.best_fits.map(p => playerRow(p.dg_id, p.player_name, `+${p.fit.toFixed(3)}`))}
            </div>
          </div>

          <div style={subCardStyle}>
            <div className="font-mono" style={subLabelStyle}>Course History Advantage</div>
            {profile.best_history.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                No course history data available for this event.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {profile.best_history.map(p => playerRow(p.dg_id, p.player_name, `+${p.history.toFixed(3)}`))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
