'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import EventDropdown from './EventDropdown';
import PredictionsTable from './PredictionsTable';
import ResultsTable from './ResultsTable';
import CourseProfileCard from './CourseProfileCard';
import type { DGResponse, DGPlayer, EventResults, ScheduleEvent, CourseProfile, PlayerProfile } from '@/lib/datagolf';

const PlayerProfileDrawer = dynamic(() => import('./PlayerProfileDrawer'), { ssr: false });

type Tab = 'predictions' | 'results';

type Props = {
  schedule: ScheduleEvent[];
};

export default function PredictionsView({ schedule }: Props) {
  const [eventId, setEventId] = useState<number | 'current'>('current');
  const [eventYear, setEventYear] = useState<number | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<Tab>('predictions');

  const [data, setData] = useState<DGResponse | null>(null);
  const [predictionsLoading, setPredictionsLoading] = useState(true);
  const [predictionsError, setPredictionsError] = useState<string | null>(null);

  const [results, setResults] = useState<EventResults | null>(null);
  const [resultsLoading, setResultsLoading] = useState(false);

  const [courseProfile, setCourseProfile] = useState<CourseProfile | null>(null);
  const [cardProfile, setCardProfile] = useState<PlayerProfile | null>(null);
  const [cardLoadingId, setCardLoadingId] = useState<number | null>(null);

  // Fetch course profile for current event
  useEffect(() => {
    if (eventId !== 'current') {
      setCourseProfile(null);
      return;
    }
    fetch('/api/course-profile')
      .then(r => r.json())
      .then((d: CourseProfile | { error: string }) => { if (!('error' in d)) setCourseProfile(d); })
      .catch(() => {});
  }, [eventId]);

  async function openCardProfile(dgId: number) {
    if (cardLoadingId !== null) return;
    setCardLoadingId(dgId);
    try {
      const res = await fetch(`/api/player/${dgId}`);
      setCardProfile(await res.json());
    } finally {
      setCardLoadingId(null);
    }
  }

  // Fetch predictions whenever event changes
  useEffect(() => {
    setPredictionsLoading(true);
    setPredictionsError(null);
    fetch(`/api/predictions?event=${eventId}`)
      .then(r => r.json())
      .then((d: DGResponse | { error: string }) => {
        if ('error' in d) {
          setPredictionsError(d.error);
          setData(null);
        } else {
          setData(d);
        }
        setPredictionsLoading(false);
      })
      .catch(e => {
        setPredictionsError(String(e));
        setPredictionsLoading(false);
      });

    // Clear stale results when event changes
    setResults(null);
  }, [eventId]);

  // Fetch results when results tab is active
  useEffect(() => {
    if (activeTab !== 'results') return;
    setResultsLoading(true);
    const url = eventId === 'current'
      ? '/api/results?event=current'
      : `/api/results?event=${eventId}&year=${eventYear ?? new Date().getFullYear()}`;
    fetch(url)
      .then(r => r.json())
      .then((d: EventResults | { error: string }) => {
        if ('error' in d) {
          setResults(null);
        } else {
          setResults(d);
        }
        setResultsLoading(false);
      })
      .catch(() => setResultsLoading(false));
  }, [activeTab, eventId, eventYear]);

  function handleEventChange(id: number | 'current', year?: number) {
    setEventId(id);
    setEventYear(year);
    setActiveTab('predictions');
  }

  const players: DGPlayer[] = data
    ? [...(data.baseline_history_fit ?? data.baseline ?? [])].sort((a, b) => b.win - a.win)
    : [];
  const winSum = players.reduce((s, p) => s + (p.win || 0), 0);
  const isLoading = activeTab === 'predictions' ? predictionsLoading : resultsLoading;

  const tabStyle = (tab: Tab): React.CSSProperties => ({
    padding: '6px 14px',
    borderRadius: '6px',
    cursor: 'pointer',
    border: activeTab === tab ? '1px solid var(--edge)' : '1px solid var(--border)',
    background: activeTab === tab ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
    color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-secondary)',
    fontFamily: 'IBM Plex Mono, monospace',
    fontSize: '11px',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
  });

  return (
    <main style={{ padding: '40px', maxWidth: '1100px', margin: '0 auto' }}>
      {cardLoadingId !== null && (
        <div className="font-mono" style={{
          position: 'fixed', top: '16px', right: '16px',
          background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
          borderRadius: '6px', padding: '8px 14px', fontSize: '12px',
          color: 'var(--text-secondary)', zIndex: 60,
        }}>
          Loading profile...
        </div>
      )}
      {cardProfile && <PlayerProfileDrawer profile={cardProfile} onClose={() => setCardProfile(null)} />}

      {/* Loading indicator top-right */}
      {isLoading && (
        <div className="font-mono" style={{
          position: 'fixed', top: '16px', right: '16px',
          background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
          borderRadius: '6px', padding: '8px 14px', fontSize: '12px',
          color: 'var(--text-secondary)', zIndex: 60,
        }}>
          Loading...
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <div className="font-mono" style={{
          fontSize: '11px', color: 'var(--text-tertiary)',
          letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px',
        }}>
          DataGolf · PGA Tour
        </div>
        <h1 className="font-display" style={{
          fontSize: '40px', fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 6px',
        }}>
          {data?.event_name ?? (predictionsLoading ? '—' : 'No active event')}
        </h1>
        <div className="font-mono" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          {data?.course ?? ''}
          {data?.last_updated ? ' · Last updated ' + new Date(data.last_updated).toLocaleString() : ''}
        </div>
      </div>

      {/* Dropdown */}
      <div style={{ marginBottom: '20px' }}>
        <EventDropdown
          events={schedule}
          currentEventId={eventId}
          currentEventName={data?.event_name}
          onChange={handleEventChange}
        />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button style={tabStyle('predictions')} onClick={() => setActiveTab('predictions')}>
          Predictions
        </button>
        <button style={tabStyle('results')} onClick={() => setActiveTab('results')}>
          Results
        </button>
      </div>

      {/* Course Profile card — current event + predictions tab only */}
      {eventId === 'current' && activeTab === 'predictions' && (
        <CourseProfileCard profile={courseProfile} onPlayerClick={openCardProfile} />
      )}

      {/* Error state for predictions */}
      {activeTab === 'predictions' && predictionsError && (
        <div style={{
          background: 'var(--bg-secondary)', border: '1px solid var(--border)',
          borderRadius: '12px', padding: '24px', marginBottom: '16px',
        }}>
          <div className="font-mono" style={{ color: 'var(--negative)', fontSize: '12px', marginBottom: '8px' }}>ERROR</div>
          <div>{predictionsError}</div>
        </div>
      )}

      {/* Predictions tab */}
      {activeTab === 'predictions' && players.length > 0 && (
        <>
          <div style={{ opacity: predictionsLoading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
            <PredictionsTable players={players} />
          </div>
          <div className="font-mono" style={{ marginTop: '16px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
            {players.length} players · Win % sum: {(winSum * 100).toFixed(1)}% (target ≈ 100%)
          </div>
        </>
      )}

      {/* Results tab */}
      {activeTab === 'results' && (
        <ResultsTable results={results} loading={resultsLoading} />
      )}
    </main>
  );
}
