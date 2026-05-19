'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  {
    label: 'GOLF BETTING',
    items: [
      { href: '/', label: 'Predictions' },
      { href: '/matchups', label: 'Matchups' },
      { href: '/best-bets', label: 'Best Bets' },
    ],
  },
  {
    label: 'KYLE vs TOMMY',
    items: [
      { href: '/kvt', label: 'Active Bet' },
      { href: '/kvt/new', label: 'New Tournament' },
      { href: '/kvt/history', label: 'History' },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside style={{
      width: '200px',
      minHeight: '100vh',
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border)',
      padding: '20px 12px',
      flexShrink: 0,
      position: 'sticky',
      top: 0,
      alignSelf: 'flex-start',
    }}>
      <div style={{ marginBottom: '28px', padding: '0 6px' }}>
        <div className="font-mono" style={{
          fontSize: '9px', color: 'var(--edge)', letterSpacing: '0.18em',
          textTransform: 'uppercase', marginBottom: '4px',
        }}>
          PalusAI
        </div>
        <div className="font-display" style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)' }}>
          Kyle&apos;s Golf
        </div>
      </div>

      {NAV.map(section => (
        <div key={section.label} style={{ marginBottom: '20px' }}>
          <div className="font-mono" style={{
            fontSize: '9px', color: 'var(--text-tertiary)',
            letterSpacing: '0.14em', textTransform: 'uppercase',
            marginBottom: '6px', padding: '0 6px',
          }}>
            {section.label}
          </div>
          {section.items.map(item => {
            const active = item.href === '/'
              ? pathname === '/'
              : pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'block',
                  padding: '7px 10px',
                  fontSize: '13px',
                  borderRadius: '5px',
                  textDecoration: 'none',
                  marginBottom: '1px',
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: active ? 'var(--bg-tertiary)' : 'transparent',
                  fontWeight: active ? 500 : 400,
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </aside>
  );
}
