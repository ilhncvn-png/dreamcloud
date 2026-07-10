export default function App() {
  return (
    <>
      <style>{`
        .page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          padding: 40px 24px;
        }

        /* Background orbs */
        .orb {
          position: fixed;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
          animation: orb-move 12s ease-in-out infinite;
        }
        .orb-1 {
          width: 400px; height: 400px;
          background: radial-gradient(circle, rgba(123,111,255,0.12) 0%, transparent 70%);
          top: -100px; left: -100px;
          animation-delay: 0s;
        }
        .orb-2 {
          width: 300px; height: 300px;
          background: radial-gradient(circle, rgba(180,111,255,0.10) 0%, transparent 70%);
          bottom: -60px; right: -60px;
          animation-delay: -4s;
        }
        .orb-3 {
          width: 200px; height: 200px;
          background: radial-gradient(circle, rgba(111,180,255,0.08) 0%, transparent 70%);
          top: 40%; left: 60%;
          animation-delay: -8s;
        }

        /* Logo */
        .logo {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 48px;
          animation: fade-in 0.8s ease both;
        }
        .logo-mark {
          width: 44px; height: 44px;
          background: linear-gradient(135deg, #7b6fff, #cc80ff);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          box-shadow: 0 0 30px rgba(123,111,255,0.3);
          animation: float 6s ease-in-out infinite;
        }
        .logo-name {
          font-size: 22px;
          font-weight: 600;
          letter-spacing: -0.02em;
          color: rgba(232,232,255,0.95);
        }

        /* Main content */
        .content {
          text-align: center;
          max-width: 560px;
          animation: fade-in 0.8s 0.2s ease both;
        }

        .badge {
          display: inline-block;
          background: rgba(123,111,255,0.12);
          border: 1px solid rgba(123,111,255,0.25);
          border-radius: 100px;
          padding: 6px 16px;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(123,111,255,0.9);
          margin-bottom: 28px;
          animation: pulse 3s ease-in-out infinite;
        }

        h1 {
          font-size: clamp(32px, 6vw, 52px);
          font-weight: 300;
          line-height: 1.15;
          letter-spacing: -0.03em;
          color: rgba(232,232,255,0.95);
          margin-bottom: 20px;
        }
        h1 strong {
          font-weight: 600;
          background: linear-gradient(135deg, #a89eff, #cc80ff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .subtitle {
          font-size: 16px;
          font-weight: 300;
          line-height: 1.7;
          color: rgba(232,232,255,0.45);
          margin-bottom: 48px;
        }

        /* Divider dots */
        .dots {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 48px;
        }
        .dot {
          width: 4px; height: 4px;
          border-radius: 50%;
          background: rgba(123,111,255,0.4);
        }
        .dot:nth-child(2) { background: rgba(123,111,255,0.7); width: 6px; height: 6px; }

        /* Notify form */
        .notify {
          display: flex;
          gap: 10px;
          max-width: 380px;
          margin: 0 auto;
          flex-wrap: wrap;
          justify-content: center;
        }
        .notify input {
          flex: 1;
          min-width: 200px;
          background: rgba(7,6,26,0.8);
          border: 1px solid rgba(123,111,255,0.2);
          border-radius: 12px;
          padding: 12px 16px;
          color: rgba(232,232,255,0.9);
          font-size: 14px;
          font-family: inherit;
          outline: none;
          transition: border-color 0.2s;
        }
        .notify input:focus { border-color: rgba(123,111,255,0.6); }
        .notify input::placeholder { color: rgba(232,232,255,0.2); }
        .notify button {
          background: linear-gradient(135deg, #7b6fff, #9b6fff);
          border: none;
          border-radius: 12px;
          padding: 12px 20px;
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          white-space: nowrap;
          transition: opacity 0.2s, transform 0.2s;
          box-shadow: 0 4px 20px rgba(123,111,255,0.25);
        }
        .notify button:hover { opacity: 0.9; transform: translateY(-1px); }

        .thankyou {
          font-size: 14px;
          color: rgba(123,111,255,0.8);
          margin-top: 12px;
          display: none;
        }

        /* Footer */
        .footer {
          margin-top: 64px;
          font-size: 12px;
          color: rgba(232,232,255,0.15);
          animation: fade-in 0.8s 0.6s ease both;
        }

        /* Stars */
        .stars {
          position: fixed;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }
        .star {
          position: absolute;
          width: 1px; height: 1px;
          background: rgba(232,232,255,0.5);
          border-radius: 50%;
          animation: pulse var(--dur, 4s) ease-in-out infinite;
          animation-delay: var(--delay, 0s);
        }
      `}</style>

      {/* Stars */}
      <div className="stars" aria-hidden="true">
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className="star"
            style={{
              top: `${(i * 37 + 13) % 100}%`,
              left: `${(i * 73 + 7) % 100}%`,
              // @ts-expect-error CSS custom props
              '--dur': `${3 + (i % 5)}s`,
              '--delay': `-${(i * 0.4) % 4}s`,
              width: i % 5 === 0 ? '2px' : '1px',
              height: i % 5 === 0 ? '2px' : '1px',
            }}
          />
        ))}
      </div>

      {/* Background orbs */}
      <div className="orb orb-1" aria-hidden="true" />
      <div className="orb orb-2" aria-hidden="true" />
      <div className="orb orb-3" aria-hidden="true" />

      <div className="page">
        {/* Logo */}
        <div className="logo">
          <div className="logo-mark">◐</div>
          <span className="logo-name">DreamCloud</span>
        </div>

        {/* Main */}
        <div className="content">
          <div className="badge">Çok Yakında</div>

          <h1>
            İnsanlığın
            <br />
            <strong>bilinçaltını haritalıyoruz.</strong>
          </h1>

          <p className="subtitle">
            Rüyaların kolektif anlamını keşfeden, arketipleri ortaya çıkaran ve insanlığın gece
            dünyasını görünür kılan platform — inşa ediliyor.
          </p>

          <div className="dots">
            <div className="dot" />
            <div className="dot" />
            <div className="dot" />
          </div>

          <NotifyForm />
        </div>

        <footer className="footer">© 2025 DreamCloud · Tüm hakları saklıdır</footer>
      </div>
    </>
  );
}

function NotifyForm() {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const thanks = form.nextElementSibling as HTMLElement | null;
    form.style.display = 'none';
    if (thanks) thanks.style.display = 'block';
  }

  return (
    <>
      <form className="notify" onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="E-posta adresiniz"
          required
          aria-label="E-posta adresiniz"
        />
        <button type="submit">Beni Haberdar Et</button>
      </form>
      <p className="thankyou">Harika! Açıldığında sizi haberdar edeceğiz. ✦</p>
    </>
  );
}
