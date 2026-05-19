export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Ask Someone Smarter Than Tommy',
};

import Chat from '@/components/ask/Chat';

export default function AskPage() {
  return (
    <main style={{
      maxWidth: '900px', margin: '0 auto',
      padding: '40px 24px',
      height: 'calc(100vh - 40px)',
      display: 'flex', flexDirection: 'column',
    }}>
      <Chat layout="page" />
    </main>
  );
}
