interface AvatarProps {
  url?: string | null;
  username?: string;
  size?: number;
}

export default function Avatar({ url, username, size = 36 }: AvatarProps) {
  const initial = username ? username[0].toUpperCase() : '?';
  const fontSize = Math.round(size * 0.42);

  if (url) {
    return (
      <img
        src={url}
        alt={username ?? 'avatar'}
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          flexShrink: 0,
        }}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        background: 'linear-gradient(135deg, rgba(123,111,255,0.35), rgba(204,128,255,0.35))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize,
        fontWeight: 600,
        color: 'rgba(167,150,255,0.9)',
        letterSpacing: '-0.02em',
      }}
    >
      {initial}
    </div>
  );
}
