// app/page.tsx

export default function HomePage() {
  console.log('>>> BakedBot HomePage rendered from /app/page.tsx <<<');
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}
    >
      <h1 style={{ fontSize: '2.5rem', fontWeight: 700, textAlign: 'center' }}>
        BakedBot AI – Fresh App Router Homepage
      </h1>
      <p style={{ maxWidth: 600, textAlign: 'center', fontSize: '1.1rem' }}>
        If you see this, the root route ("/") is wired correctly to app/page.tsx.
      </p>
      <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>
        Check your dev terminal for the log:
        {' '}“&gt;&gt;&gt; BakedBot HomePage rendered from /app/page.tsx &lt;&lt;&lt;”.
      </p>
    </main>
  );
}
