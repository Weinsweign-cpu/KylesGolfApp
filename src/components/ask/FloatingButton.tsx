'use client';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { MessageCircle, X } from 'lucide-react';
import Chat from './Chat';

export default function FloatingButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (pathname === '/ask') return null;

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Ask Someone Smarter Than Tommy"
        style={{
          position: 'fixed', bottom: '24px', right: '24px',
          width: '56px', height: '56px', borderRadius: '50%',
          background: 'var(--ai, #8B5CF6)', color: 'white',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(139,92,246,0.4)',
          transition: 'transform 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        {open ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {open && (
        <div style={{
          position: 'fixed', bottom: '92px', right: '24px',
          width: '380px', height: '600px',
          maxHeight: 'calc(100vh - 120px)',
          background: 'var(--bg-secondary)', border: '1px solid var(--border)',
          borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          zIndex: 999, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <Chat layout="widget" />
        </div>
      )}
    </>
  );
}
