import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { useQuery } from '@tanstack/react-query';
import { getMyProfile } from '@/api/users.api';
import Avatar from './Avatar';

const NAV_ITEMS = [
  { icon: '◈', label: 'Ana Sayfa', to: '/home' },
  { icon: '✦', label: 'Keşfet', to: '/explore', soon: true },
  { icon: '◉', label: 'Rüya Atlası', to: '/atlas', soon: true },
  { icon: '⟡', label: 'Eşleşmeler', to: '/matches', soon: true },
  { icon: '◎', label: 'Bildirimler', to: '/notifications', soon: true },
  { icon: '◐', label: 'Dünyam', to: '/my-world', soon: true },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ['my-profile'],
    queryFn: getMyProfile,
    staleTime: 5 * 60 * 1000,
  });

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        style={{
          width: 'var(--sidebar-w)',
          flexShrink: 0,
          background: 'rgba(7,6,26,0.95)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 100,
        }}
      >
        {/* Logo */}
        <div style={{ padding: '22px 20px', borderBottom: '1px solid var(--border)' }}>
          <NavLink
            to="/home"
            style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 11,
                background: 'linear-gradient(135deg,#7B6FFF,#CC80FF)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                flexShrink: 0,
                boxShadow: '0 0 18px rgba(123,111,255,0.3)',
              }}
            >
              ◐
            </div>
            <span
              style={{
                fontSize: 15,
                fontWeight: 600,
                letterSpacing: '-0.02em',
                color: 'rgba(232,232,255,0.92)',
              }}
            >
              DreamCloud
            </span>
          </NavLink>
        </div>

        {/* Nav */}
        <nav
          style={{
            flex: 1,
            padding: '12px 10px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {NAV_ITEMS.map((item) =>
            item.soon ? (
              <div
                key={item.to}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  borderRadius: 'var(--r-md)',
                  opacity: 0.35,
                  cursor: 'default',
                }}
              >
                <span
                  style={{ fontSize: 14, width: 18, textAlign: 'center', color: 'var(--primary)' }}
                >
                  {item.icon}
                </span>
                <span style={{ fontSize: 14, color: 'var(--text-2)' }}>{item.label}</span>
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: 9,
                    background: 'rgba(123,111,255,0.15)',
                    border: '1px solid rgba(123,111,255,0.2)',
                    borderRadius: 4,
                    padding: '2px 5px',
                    color: 'rgba(123,111,255,0.6)',
                    letterSpacing: '0.08em',
                  }}
                >
                  YAKINDA
                </span>
              </div>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  borderRadius: 'var(--r-md)',
                  textDecoration: 'none',
                  transition: 'all 0.15s',
                  background: isActive ? 'rgba(123,111,255,0.1)' : 'transparent',
                  border: isActive ? '1px solid rgba(123,111,255,0.18)' : '1px solid transparent',
                  color: isActive ? 'var(--text-1)' : 'var(--text-2)',
                })}
              >
                <span
                  style={{ fontSize: 14, width: 18, textAlign: 'center', color: 'var(--primary)' }}
                >
                  {item.icon}
                </span>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{item.label}</span>
              </NavLink>
            ),
          )}
        </nav>

        {/* Profile footer */}
        <div style={{ borderTop: '1px solid var(--border)', padding: '14px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <NavLink to={profile?.username ? `/profile/${profile.username}` : '#'}>
              <Avatar
                url={profile?.avatarUrl}
                username={profile?.username ?? user?.email}
                size={34}
              />
            </NavLink>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--text-1)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {profile?.displayName ?? profile?.username ?? user?.email}
              </p>
              {profile?.username && (
                <p style={{ fontSize: 11, color: 'var(--text-3)' }}>@{profile.username}</p>
              )}
            </div>
            <button
              onClick={handleLogout}
              title="Çıkış yap"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 6,
                color: 'var(--text-3)',
                fontSize: 14,
                transition: 'color 0.2s',
                borderRadius: 'var(--r-sm)',
              }}
              onMouseOver={(e) => (e.currentTarget.style.color = 'var(--danger)')}
              onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-3)')}
            >
              ⏻
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main
        style={{
          flex: 1,
          marginLeft: 'var(--sidebar-w)',
          overflowY: 'auto',
          overflowX: 'hidden',
          minHeight: '100vh',
        }}
      >
        {/* Mobile top bar (sidebar hidden on mobile) */}
        <style>{`
          @media (max-width: 768px) {
            aside { display: none !important; }
            main { margin-left: 0 !important; }
            .mobile-topbar { display: flex !important; }
          }
        `}</style>
        <div
          className="mobile-topbar"
          style={{
            display: 'none',
            position: 'sticky',
            top: 0,
            zIndex: 50,
            background: 'rgba(6,6,20,0.95)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid var(--border)',
            padding: '12px 16px',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 9,
              background: 'linear-gradient(135deg,#7B6FFF,#CC80FF)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
            }}
          >
            ◐
          </div>
          <span style={{ fontSize: 15, fontWeight: 600, flex: 1 }}>DreamCloud</span>
          <Avatar url={profile?.avatarUrl} username={profile?.username} size={28} />
        </div>

        {children}
      </main>
    </div>
  );
}
