'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { EventOption } from '@/lib/datagolf';
import type { KvtTournament, KvtMatchup } from '@/lib/kvt/db';

type Player = { dg_id: number; player_name: string };
type Slot = Player | null;
type MatchupRow = { kyle: Slot; tommy: Slot };

function formatName(dgName: string): string {
  if (!dgName.includes(',')) return dgName;
  const [last, rest] = dgName.split(',', 2);
  return rest.trim() + ' ' + last.trim();
}

function PlayerCombobox({
  players, value, onChange, usedIds, placeholder,
}: {
  players: Player[];
  value: Slot;
  onChange: (p: Player | null) => void;
  usedIds: Set<number>;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = players
    .filter(p => !usedIds.has(p.dg_id) || p.dg_id === value?.dg_id)
    .filter(p => formatName(p.player_name).toLowerCase().includes(query.toLowerCase()))
    .slice(0, 8);

  function select(p: Player) {
    onChange(p);
    setQuery('');
    setOpen(false);
  }

  function clear() {
    onChange(null);
    setQuery('');
    inputRef.current?.focus();
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (listRef.current && !listRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div style={{ position: 'relative', flex: 1 }}>
      <div style={{
        display: 'flex', alignItems: 'center',
        background: 'var(--bg-secondary)', border: `1px solid ${open ? 'var(--edge)' : 'var(--border)'}`,
        borderRadius: '6px', overflow: 'hidden',
      }}>
        {value ? (
          <>
            <span style={{ flex: 1, padding: '8px 10px', fontSize: '13px', fontFamily: 'IBM Plex Mono, monospace' }}>
              {formatName(value.player_name)}
            </span>
            <button onClick={clear} style={{
              background: 'none', border: 'none', color: 'var(--text-tertiary)',
              cursor: 'pointer', padding: '8px 10px', fontSize: '14px',
            }}>×</button>
          </>
        ) : (
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            style={{
              flex: 1, padding: '8px 10px', background: 'transparent', border: 'none',
              outline: 'none', color: 'var(--text-primary)', fontSize: '13px',
              fontFamily: 'IBM Plex Mono, monospace',
            }}
          />
        )}
      </div>
      {open && !value && filtered.length > 0 && (
        <div ref={listRef} style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
          borderRadius: '6px', marginTop: '2px', overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }}>
          {filtered.map(p => (
            <div
              key={p.dg_id}
              onMouseDown={() => select(p)}
              style={{
                padding: '9px 12px', cursor: 'pointer', fontSize: '13px',
                fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text-primary)',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}
            >
              {formatName(p.player_name)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusDot({ status }: { status: EventOption['status'] }) {
  const color = status === 'in_progress' ? 'var(--positive)' : status === 'upcoming' ? 'var(--text-secondary)' : 'var(--text-tertiary)';
  return (
    <div style={{
      position: 'absolute', top: '8px', right: '8px',
      width: '6px', height: '6px', borderRadius: '50%',
      background: color,
      opacity: status === 'completed' ? 0.45 : 1,
    }} />
  );
}

function EventPill({
  e,
  selected,
  onClick,
}: {
  e: EventOption;
  selected: boolean;
  onClick: () => void;
}) {
  const pickable = e.is_major || e.status !== 'completed';
  const subtitle = (() => {
    const course = e.course;
    const date = e.start_date
      ? new Date(e.start_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : null;
    if (!course && !date) return null;
    if (!course) return date;
    if (!date) return course;
    return course.length <= date.length ? course : date;
  })();

  return (
    <div
      title={!pickable ? 'Completed event — only majors can be back-filled.' : undefined}
      onClick={pickable ? onClick : undefined}
      style={{
        position: 'relative',
        padding: '10px 20px 10px 12px',
        borderRadius: '8px',
        cursor: pickable ? 'pointer' : 'not-allowed',
        opacity: pickable ? 1 : 0.5,
        background: selected ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
        border: `1px solid ${selected ? 'var(--edge)' : 'var(--border)'}`,
        minWidth: '110px',
        userSelect: 'none',
      }}
      onMouseEnter={e => { if (pickable) e.currentTarget.style.background = selected ? 'var(--bg-tertiary)' : 'var(--bg-hover)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = selected ? 'var(--bg-tertiary)' : 'var(--bg-secondary)'; }}
    >
      <StatusDot status={e.status} />
      <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: subtitle ? '3px' : 0, lineHeight: 1.3 }}>
        {e.is_major && (
          <span style={{ color: 'var(--edge)', marginRight: '4px', fontSize: '11px' }}>★</span>
        )}
        {e.event_name}
      </div>
      {subtitle && (
        <div className="font-mono" style={{
          fontSize: '10px', color: 'var(--text-tertiary)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          maxWidth: '180px',
        }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

const SECTION_LABELS: Record<string, string> = {
  majors: 'MAJORS',
  upcoming: 'UPCOMING',
  completed: 'RECENTLY COMPLETED',
};

export default function NewTournamentForm({
  events,
  editTournament,
  editMatchups,
}: {
  events: EventOption[];
  editTournament?: KvtTournament;
  editMatchups?: KvtMatchup[];
}) {
  const router = useRouter();
  const isEdit = !!editTournament;

  const [selectedEvent, setSelectedEvent] = useState<EventOption | null>(() => {
    if (!editTournament) return null;
    return events.find(e => e.dg_event_id === editTournament.dg_event_id) ?? {
      dg_event_id: editTournament.dg_event_id,
      year: editTournament.year,
      event_name: editTournament.event_name,
      course: editTournament.course,
      start_date: editTournament.start_date,
      is_major: false,
      status: 'upcoming' as const,
      category: 'pga_upcoming' as const,
    };
  });

  const [field, setField] = useState<Player[]>([]);
  const [fieldLoading, setFieldLoading] = useState(false);
  const [matchups, setMatchups] = useState<MatchupRow[]>(() => {
    if (editMatchups?.length === 6) {
      return editMatchups.map(m => ({
        kyle: { dg_id: m.kyle_dg_id, player_name: m.kyle_player_name },
        tommy: { dg_id: m.tommy_dg_id, player_name: m.tommy_player_name },
      }));
    }
    return Array.from({ length: 6 }, () => ({ kyle: null, tommy: null }));
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEdit && selectedEvent) {
      fetchField(selectedEvent);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchField(event: EventOption) {
    setField([]);
    setFieldLoading(true);
    try {
      const res = await fetch(`/api/field?event=${event.dg_event_id}&year=${event.year}&status=${event.status}`);
      const d = await res.json();
      setField(d.players ?? []);
    } finally {
      setFieldLoading(false);
    }
  }

  async function loadField(event: EventOption) {
    setSelectedEvent(event);
    setMatchups(Array.from({ length: 6 }, () => ({ kyle: null, tommy: null })));
    await fetchField(event);
  }

  const usedIds = new Set<number>(
    matchups.flatMap(m => [m.kyle?.dg_id, m.tommy?.dg_id].filter(Boolean) as number[])
  );

  function setSlot(idx: number, side: 'kyle' | 'tommy', player: Player | null) {
    setMatchups(prev => prev.map((m, i) => i === idx ? { ...m, [side]: player } : m));
  }

  const allFilled = matchups.every(m => m.kyle && m.tommy);

  async function handleSubmit() {
    if (!selectedEvent || !allFilled) return;
    setSubmitting(true);
    setError(null);
    try {
      const picks = matchups.map((m, i) => ({
        matchup_num: i + 1,
        kyle_dg_id: m.kyle!.dg_id,
        kyle_player_name: m.kyle!.player_name,
        tommy_dg_id: m.tommy!.dg_id,
        tommy_player_name: m.tommy!.player_name,
      }));

      if (isEdit) {
        const res = await fetch('/api/kvt/tournament', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editTournament!.id, matchups: picks }),
        });
        if (!res.ok) {
          const d = await res.json();
          setError(d.error ?? 'Failed to update tournament');
          return;
        }
        router.push('/kvt');
      } else {
        const res = await fetch('/api/kvt/tournament', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dg_event_id: selectedEvent.dg_event_id,
            year: selectedEvent.year,
            event_name: selectedEvent.event_name,
            course: selectedEvent.course,
            start_date: selectedEvent.start_date,
            matchups: picks,
          }),
        });
        if (!res.ok) {
          const d = await res.json();
          setError(d.error ?? 'Failed to create tournament');
          return;
        }
        router.push('/kvt');
      }
    } finally {
      setSubmitting(false);
    }
  }

  // Group events into sections
  const majors = events.filter(e => e.is_major);
  const upcoming = events.filter(e => !e.is_major && (e.status === 'upcoming' || e.status === 'in_progress'));
  const recentCompleted = events.filter(e => !e.is_major && e.status === 'completed').slice(0, 8);

  const sections = [
    { key: 'majors', label: SECTION_LABELS.majors, items: majors },
    { key: 'upcoming', label: SECTION_LABELS.upcoming, items: upcoming },
    { key: 'completed', label: SECTION_LABELS.completed, items: recentCompleted },
  ].filter(s => s.items.length > 0);

  return (
    <main style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
      <div className="font-mono" style={{ fontSize: '11px', color: 'var(--text-tertiary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
        Kyle vs Tommy
      </div>
      <h1 className="font-display" style={{ fontSize: '40px', fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 24px' }}>
        {isEdit ? 'Edit Picks' : 'New Tournament'}
      </h1>

      {/* Event picker — hidden in edit mode */}
      {!isEdit && (
        <div style={{ marginBottom: '28px' }}>
          <div className="font-mono" style={{ fontSize: '10px', color: 'var(--text-tertiary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '14px' }}>
            Select Tournament
          </div>
          {sections.map(section => (
            <div key={section.key} style={{ marginBottom: '20px' }}>
              <div className="font-mono" style={{
                fontSize: '9px', color: 'var(--text-tertiary)', letterSpacing: '0.14em',
                textTransform: 'uppercase', marginBottom: '8px',
              }}>
                {section.label}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {section.items.map(e => (
                  <EventPill
                    key={e.dg_event_id}
                    e={e}
                    selected={selectedEvent?.dg_event_id === e.dg_event_id}
                    onClick={() => loadField(e)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit mode: show locked event name */}
      {isEdit && selectedEvent && (
        <div style={{ marginBottom: '24px' }}>
          <div className="font-mono" style={{ fontSize: '10px', color: 'var(--text-tertiary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
            Tournament
          </div>
          <div style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text-primary)' }}>
            {selectedEvent.event_name}
          </div>
          {selectedEvent.course && (
            <div className="font-mono" style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {selectedEvent.course}
            </div>
          )}
        </div>
      )}

      {/* Matchup section */}
      {(selectedEvent || isEdit) && (
        <>
          {selectedEvent?.status === 'completed' && (
            <div className="font-mono" style={{
              fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '16px',
              padding: '10px 14px', background: 'rgba(59,123,245,0.08)',
              border: '1px solid rgba(59,123,245,0.2)', borderRadius: '6px',
            }}>
              Backfilling a completed event — make sure your picks match what you actually drafted at the time.
            </div>
          )}

          {fieldLoading ? (
            <div className="font-mono" style={{ color: 'var(--text-tertiary)', fontSize: '13px', padding: '20px 0' }}>
              Loading field...
            </div>
          ) : (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 40px 1fr', gap: '8px', marginBottom: '8px', padding: '0 4px' }}>
                <div />
                <div className="font-mono" style={{ fontSize: '10px', color: 'var(--edge)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Kyle</div>
                <div />
                <div className="font-mono" style={{ fontSize: '10px', color: 'var(--text-secondary)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Tommy</div>
              </div>

              {matchups.map((m, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 40px 1fr', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                  <div className="font-mono" style={{ fontSize: '11px', color: 'var(--text-tertiary)', textAlign: 'right', paddingRight: '4px' }}>
                    {i + 1}
                  </div>
                  <PlayerCombobox
                    players={field} value={m.kyle}
                    onChange={p => setSlot(i, 'kyle', p)}
                    usedIds={usedIds} placeholder="Kyle's pick..."
                  />
                  <div className="font-mono" style={{ fontSize: '11px', color: 'var(--text-tertiary)', textAlign: 'center' }}>vs</div>
                  <PlayerCombobox
                    players={field} value={m.tommy}
                    onChange={p => setSlot(i, 'tommy', p)}
                    usedIds={usedIds} placeholder="Tommy's pick..."
                  />
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="font-mono" style={{ color: 'var(--negative)', fontSize: '12px', marginBottom: '16px', padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px' }}>
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!allFilled || submitting}
            style={{
              padding: '12px 28px', background: allFilled ? 'var(--edge)' : 'var(--bg-tertiary)',
              color: allFilled ? '#fff' : 'var(--text-tertiary)', border: 'none',
              borderRadius: '6px', cursor: allFilled ? 'pointer' : 'not-allowed',
              fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', letterSpacing: '0.1em',
              fontWeight: 500,
            }}
          >
            {submitting
              ? (isEdit ? 'SAVING...' : 'CREATING...')
              : allFilled
                ? (isEdit ? 'SAVE CHANGES →' : 'CREATE TOURNAMENT →')
                : `FILL ALL 12 PICKS (${matchups.filter(m => m.kyle && m.tommy).length * 2}/12)`}
          </button>
        </>
      )}
    </main>
  );
}
