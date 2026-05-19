'use client';

import { useEffect, useRef, useState } from 'react';
import type { ScheduleEvent } from '@/lib/datagolf';

type Props = {
  events: ScheduleEvent[];
  currentEventId: number | 'current';
  currentEventName?: string;
  onChange: (eventId: number | 'current', year?: number) => void;
};

function fmtDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function shortCourse(course: string): string {
  return course.split(';')[0];
}

export default function EventDropdown({ events, currentEventId, currentEventName, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function keyHandler(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    window.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      window.removeEventListener('keydown', keyHandler);
    };
  }, []);

  const now = new Date();
  const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const thisWeek = events.filter(e => {
    const start = new Date(e.start_date + 'T00:00:00');
    return e.status === 'active' || (start >= now && start <= sevenDaysOut);
  });

  const recent = events
    .filter(e => e.status === 'completed')
    .sort((a, b) => b.start_date.localeCompare(a.start_date))
    .slice(0, 8);

  const upcoming = events
    .filter(e => {
      const start = new Date(e.start_date + 'T00:00:00');
      return e.status !== 'completed' && start > sevenDaysOut;
    })
    .sort((a, b) => a.start_date.localeCompare(b.start_date));

  const selectedEvent = events.find(e => e.event_id === currentEventId);
  const buttonLabel = currentEventId === 'current'
    ? (currentEventName ?? 'Current Event')
    : (selectedEvent?.event_name ?? `Event ${currentEventId}`);

  function select(id: number | 'current', year?: number) {
    onChange(id, year);
    setOpen(false);
  }

  function renderRow(e: ScheduleEvent) {
    const isSelected = e.event_id === currentEventId;
    const eventYear = e.start_date ? parseInt(e.start_date.slice(0, 4), 10) : undefined;
    return (
      <div
        key={e.event_id}
        onClick={() => select(e.event_id, eventYear)}
        style={{
          padding: '10px 16px',
          cursor: 'pointer',
          background: isSelected ? 'var(--bg-hover)' : 'transparent',
          borderLeft: isSelected ? '2px solid var(--edge)' : '2px solid transparent',
          transition: 'background 0.1s',
        }}
        onMouseEnter={ev => (ev.currentTarget.style.background = 'var(--bg-hover)')}
        onMouseLeave={ev => (ev.currentTarget.style.background = isSelected ? 'var(--bg-hover)' : 'transparent')}
      >
        <div style={{
          fontSize: '13px',
          fontWeight: isSelected ? 600 : 400,
          color: 'var(--text-primary)',
          marginBottom: '2px',
        }}>
          {e.event_name}
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
            {shortCourse(e.course)}
          </span>
          <span className="font-mono" style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
            {fmtDate(e.start_date)}
          </span>
        </div>
      </div>
    );
  }

  function renderSection(title: string, items: ScheduleEvent[], extra?: React.ReactNode) {
    if (items.length === 0 && !extra) return null;
    return (
      <div>
        <div
          className="font-display"
          style={{
            fontSize: '10px',
            color: 'var(--text-tertiary)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            padding: '10px 16px 6px',
            fontWeight: 600,
          }}
        >
          {title}
        </div>
        {extra}
        {items.map(renderRow)}
      </div>
    );
  }

  const currentRow = (
    <div
      onClick={() => select('current')}
      style={{
        padding: '10px 16px',
        cursor: 'pointer',
        background: currentEventId === 'current' ? 'var(--bg-hover)' : 'transparent',
        borderLeft: currentEventId === 'current' ? '2px solid var(--edge)' : '2px solid transparent',
        transition: 'background 0.1s',
      }}
      onMouseEnter={ev => (ev.currentTarget.style.background = 'var(--bg-hover)')}
      onMouseLeave={ev => (ev.currentTarget.style.background = currentEventId === 'current' ? 'var(--bg-hover)' : 'transparent')}
    >
      <div style={{ fontSize: '13px', fontWeight: currentEventId === 'current' ? 600 : 400, color: 'var(--text-primary)', marginBottom: '2px' }}>
        {currentEventName ?? 'Current Event'} <span className="font-mono" style={{ fontSize: '10px', color: 'var(--edge)', marginLeft: '6px' }}>LIVE</span>
      </div>
    </div>
  );

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '8px 14px',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          fontSize: '13px',
          fontFamily: 'inherit',
        }}
      >
        <span style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {buttonLabel}
        </span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, opacity: 0.5, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
          <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 100,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            minWidth: '320px',
            maxHeight: '400px',
            overflowY: 'auto',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          {renderSection('This Week', thisWeek, currentRow)}
          {renderSection('Recent', recent)}
          {renderSection('Upcoming', upcoming)}
        </div>
      )}
    </div>
  );
}
