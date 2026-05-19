'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Predictions' },
  { href: '/matchups', label: 'Matchups' },
  { href: '/best-bets', label: 'Best Bets' },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav style={{
      padding: '12px 40px',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      gap: '8px',
      background: 'var(--bg-primary)',
    }}>
      {LINKS.map(({ href, label }) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: active ? '1px solid var(--edge)' : '1px solid var(--border)',
              background: active ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
              color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '11px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              textDecoration: 'none',
            }}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
