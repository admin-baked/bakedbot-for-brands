// src/app/page.tsx

export default function HomePage() {
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
        BakedBot AI – Homepage
      </h1>
      <p style={{ maxWidth: 600, textAlign: 'center', fontSize: '1.1rem' }}>
        If you can read this, the App Router is happy and "/" is no longer a 404.
      </p>
      <a
        href="/menu/default"
        style={{
          padding: '0.75rem 1.5rem',
          borderRadius: 999,
          border: '1px solid black',
          fontSize: '1rem',
        }}
      >
        Go to /menu
      </a>
    </main>
  );
}
