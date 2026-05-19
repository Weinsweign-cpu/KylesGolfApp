'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Trash2 } from 'lucide-react';

type ToolPill = { status: 'pending' | 'done'; name: string };

type Message = {
  role: 'user' | 'assistant';
  content: string;
  pills?: ToolPill[];
};

const STORAGE_KEY = 'ask-tommy-chat';

const TOOL_LABELS: Record<string, string> = {
  get_current_event: 'current event',
  get_predictions: 'predictions',
  get_best_bets: 'best bets',
  get_matchups: 'matchups',
  get_player_profile: 'player profile',
  get_kvt_state: 'Kyle vs Tommy state',
  get_leaderboard: 'leaderboard',
};

const EXAMPLE_PROMPTS = [
  "Who's the best value bet to win this week?",
  "Tell me about Scottie Scheffler's recent form",
  "How am I doing against Tommy right now?",
  "Any +EV head-to-head matchups today?",
];

function ToolPillEl({ pill }: { pill: ToolPill }) {
  const label = TOOL_LABELS[pill.name] ?? pill.name;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px',
      padding: '2px 7px', borderRadius: '10px',
      background: 'var(--bg-tertiary)',
      color: pill.status === 'done' ? 'var(--ai)' : 'var(--text-tertiary)',
      border: `1px solid ${pill.status === 'done' ? 'var(--ai)' : 'var(--border)'}`,
      marginRight: '4px', marginBottom: '4px',
      transition: 'color 0.2s, border-color 0.2s',
    }}>
      {pill.status === 'done' ? '✓' : '⋯'} {label}
    </span>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';
  return (
    <div style={{
      display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: '12px',
    }}>
      <div style={{
        maxWidth: '85%',
        background: isUser ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
        border: `1px solid ${isUser ? 'var(--border)' : 'rgba(139,92,246,0.15)'}`,
        borderRadius: isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
        padding: '10px 14px',
      }}>
        {msg.pills && msg.pills.length > 0 && (
          <div style={{ marginBottom: '6px', display: 'flex', flexWrap: 'wrap' }}>
            {msg.pills.map((p, i) => <ToolPillEl key={i} pill={p} />)}
          </div>
        )}
        <div style={{
          fontSize: '13px', lineHeight: '1.55',
          color: 'var(--text-primary)',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {msg.content || (msg.role === 'assistant' && <span style={{ color: 'var(--text-tertiary)' }}>Thinking…</span>)}
        </div>
      </div>
    </div>
  );
}

export default function Chat({ layout }: { layout: 'page' | 'widget' }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setMessages(JSON.parse(stored));
    } catch {}
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const persist = useCallback((msgs: Message[]) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs)); } catch {}
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || streaming) return;
    setError(null);

    const userMsg: Message = { role: 'user', content: text.trim() };
    const assistantMsg: Message = { role: 'assistant', content: '', pills: [] };

    setMessages(prev => {
      const next = [...prev, userMsg, assistantMsg];
      return next;
    });
    setInput('');
    setStreaming(true);

    const history = messages.map(m => ({ role: m.role, content: m.content }));
    history.push({ role: 'user', content: text.trim() });

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          const lines = part.split('\n');
          let eventName = '';
          let dataStr = '';
          for (const line of lines) {
            if (line.startsWith('event: ')) eventName = line.slice(7).trim();
            if (line.startsWith('data: ')) dataStr = line.slice(6).trim();
          }
          if (!eventName || !dataStr) continue;

          let payload: Record<string, unknown>;
          try { payload = JSON.parse(dataStr); } catch { continue; }

          if (eventName === 'text') {
            setMessages(prev => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last.role === 'assistant') {
                next[next.length - 1] = { ...last, content: last.content + (payload.text as string) };
              }
              return next;
            });
          } else if (eventName === 'tool_use') {
            setMessages(prev => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last.role === 'assistant') {
                next[next.length - 1] = {
                  ...last,
                  pills: [...(last.pills ?? []), { status: 'pending', name: payload.name as string }],
                };
              }
              return next;
            });
          } else if (eventName === 'tool_result') {
            setMessages(prev => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last.role === 'assistant') {
                const pills = (last.pills ?? []).map(p =>
                  p.name === (payload.name as string) && p.status === 'pending'
                    ? { ...p, status: 'done' as const }
                    : p
                );
                next[next.length - 1] = { ...last, pills };
              }
              return next;
            });
          } else if (eventName === 'error') {
            setError((payload.message as string) ?? 'Something went wrong');
          }
        }
      }

      setMessages(prev => { persist(prev); return prev; });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setStreaming(false);
    }
  }, [messages, streaming, persist]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const isEmpty = messages.length === 0;
  const isWidget = layout === 'widget';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Header */}
      <div style={{
        padding: isWidget ? '12px 14px' : '16px 20px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div>
          <div className="font-display" style={{
            fontSize: isWidget ? '13px' : '16px',
            fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2,
          }}>
            Ask Someone Smarter Than Tommy
          </div>
          <div className="font-mono" style={{ fontSize: '9px', color: 'var(--text-tertiary)', marginTop: '3px', letterSpacing: '0.05em' }}>
            powered by Claude Haiku 4.5 · session resets on browser data clear
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            title="Clear conversation"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-tertiary)', padding: '2px', flexShrink: 0,
              display: 'flex', alignItems: 'center',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--negative)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Message list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: isWidget ? '12px' : '20px', minHeight: 0 }}>
        {isEmpty ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '20px', padding: '20px 0' }}>
            <div style={{ textAlign: 'center' }}>
              <div className="font-display" style={{ fontSize: isWidget ? '15px' : '22px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Ask Someone Smarter Than Tommy
              </div>
              <div className="font-mono" style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                Ask anything — I&apos;m smarter than Tommy
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '340px' }}>
              {EXAMPLE_PROMPTS.map(p => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  style={{
                    background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                    borderRadius: '8px', padding: '10px 14px', cursor: 'pointer',
                    fontFamily: 'IBM Plex Sans, system-ui, sans-serif',
                    fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'left',
                    transition: 'border-color 0.15s, color 0.15s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--ai)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
            {error && (
              <div className="font-mono" style={{ fontSize: '11px', color: 'var(--negative)', padding: '8px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', marginTop: '8px' }}>
                ⚠ {error}
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div style={{
        padding: isWidget ? '10px 12px' : '16px 20px',
        borderTop: '1px solid var(--border)', flexShrink: 0,
        display: 'flex', gap: '8px', alignItems: 'flex-end',
      }}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything about this week's tournament…"
          rows={1}
          disabled={streaming}
          style={{
            flex: 1, resize: 'none', background: 'var(--bg-tertiary)',
            border: '1px solid var(--border)', borderRadius: '8px',
            padding: '8px 12px', color: 'var(--text-primary)',
            fontFamily: 'IBM Plex Sans, system-ui, sans-serif', fontSize: '13px',
            lineHeight: '1.5', outline: 'none', minHeight: '36px', maxHeight: '120px',
            opacity: streaming ? 0.6 : 1,
          }}
          onInput={e => {
            const el = e.currentTarget;
            el.style.height = 'auto';
            el.style.height = Math.min(el.scrollHeight, 120) + 'px';
          }}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={streaming || !input.trim()}
          style={{
            background: 'var(--edge)', color: '#fff', border: 'none',
            borderRadius: '8px', padding: '8px 14px', cursor: 'pointer',
            fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px',
            letterSpacing: '0.06em', fontWeight: 500, flexShrink: 0,
            opacity: streaming || !input.trim() ? 0.4 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          {streaming ? '…' : 'SEND'}
        </button>
      </div>
    </div>
  );
}
