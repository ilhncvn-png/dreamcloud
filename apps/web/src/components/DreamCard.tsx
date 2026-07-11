import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Dream } from '@/types';
import Avatar from './Avatar';
import { toggleLike, toggleSave } from '@/api/dreams.api';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Az önce';
  if (m < 60) return `${m}d önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}s önce`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}g önce`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}h önce`;
  return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

const CAT_LABELS: Record<string, string> = {
  lucid: 'Lucid',
  nightmare: 'Kabus',
  beautiful: 'Güzel',
  normal: 'Normal',
  adventure: 'Macera',
  recurring: 'Tekrarlayan',
  prophetic: 'Kehanet',
  fantasy: 'Fantezi',
  mundane: 'Sıradan',
  surreal: 'Tuhaf',
};
const CAT_COLORS: Record<string, string> = {
  lucid: '#7B6FFF',
  nightmare: '#FF4A5E',
  beautiful: '#38D68A',
  adventure: '#FFB800',
  recurring: '#00CFFF',
  prophetic: '#CC80FF',
  fantasy: '#FF8CF7',
  mundane: '#5A5A84',
  surreal: '#FF8C00',
  normal: '#7B6FFF',
};

interface DreamCardProps {
  dream: Dream;
  queryKey: unknown[];
}

export default function DreamCard({ dream, queryKey }: DreamCardProps) {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [localLiked, setLocalLiked] = useState(dream.isLiked);
  const [localLikeCount, setLocalLikeCount] = useState(dream.likeCount);
  const [localSaved, setLocalSaved] = useState(dream.isSaved);
  const [localSaveCount, setLocalSaveCount] = useState(dream.saveCount);

  const likeMut = useMutation({
    mutationFn: () => toggleLike(dream.id),
    onMutate: () => {
      setLocalLiked((p) => !p);
      setLocalLikeCount((p) => p + (localLiked ? -1 : 1));
    },
    onError: () => {
      setLocalLiked(dream.isLiked);
      setLocalLikeCount(dream.likeCount);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey }),
  });

  const saveMut = useMutation({
    mutationFn: () => toggleSave(dream.id),
    onMutate: () => {
      setLocalSaved((p) => !p);
      setLocalSaveCount((p) => p + (localSaved ? -1 : 1));
    },
    onError: () => {
      setLocalSaved(dream.isSaved);
      setLocalSaveCount(dream.saveCount);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey }),
  });

  const catColor = CAT_COLORS[dream.category] ?? '#7B6FFF';
  const title = dream.title ?? dream.content.slice(0, 60) + (dream.content.length > 60 ? '…' : '');
  const preview = dream.content.slice(0, 200) + (dream.content.length > 200 ? '…' : '');

  return (
    <article
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(123,111,255,0.13)',
        borderRadius: 'var(--r-lg)',
        padding: '20px 22px',
        transition: 'border-color 0.2s, background 0.2s',
      }}
      onMouseOver={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(123,111,255,0.22)';
        (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
      }}
      onMouseOut={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(123,111,255,0.13)';
        (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
      }}
    >
      {/* Author row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <button
          onClick={() => dream.author?.username && navigate(`/profile/${dream.author.username}`)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: dream.author?.username ? 'pointer' : 'default',
          }}
        >
          <Avatar url={dream.author?.avatarUrl} username={dream.author?.username} size={36} />
        </button>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <button
            onClick={() => dream.author?.username && navigate(`/profile/${dream.author.username}`)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: dream.author?.username ? 'pointer' : 'default',
              display: 'block',
            }}
          >
            <p
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: 'var(--text-1)',
                textAlign: 'left',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {dream.author?.username ?? 'Anonim'}
            </p>
          </button>
          <p style={{ fontSize: 12, color: 'var(--text-3)' }}>{timeAgo(dream.createdAt)}</p>
        </div>
        {/* Category badge */}
        <div
          style={{
            padding: '3px 10px',
            borderRadius: 100,
            fontSize: 11,
            fontWeight: 500,
            background: `${catColor}14`,
            border: `1px solid ${catColor}30`,
            color: catColor,
          }}
        >
          {CAT_LABELS[dream.category] ?? dream.category}
        </div>
      </div>

      {/* Content */}
      <button
        onClick={() => navigate(`/dream/${dream.id}`)}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          width: '100%',
          textAlign: 'left',
          display: 'block',
        }}
      >
        <h3
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--text-1)',
            marginBottom: 8,
            lineHeight: 1.35,
            letterSpacing: '-0.01em',
          }}
        >
          {title}
        </h3>
        <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7, marginBottom: 12 }}>
          {preview}
        </p>
      </button>

      {/* Tags */}
      {dream.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {dream.tags.slice(0, 5).map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: 11,
                padding: '3px 9px',
                borderRadius: 100,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'var(--text-3)',
              }}
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          borderTop: '1px solid rgba(255,255,255,0.05)',
          paddingTop: 14,
        }}
      >
        {/* Like */}
        <ActionBtn
          icon={localLiked ? '♥' : '♡'}
          count={localLikeCount}
          active={localLiked}
          activeColor="#FF4A5E"
          onClick={() => likeMut.mutate()}
          disabled={likeMut.isPending}
          label="Beğen"
        />
        {/* Comment */}
        <ActionBtn
          icon="◎"
          count={dream.commentCount}
          active={false}
          activeColor="var(--primary)"
          onClick={() => navigate(`/dream/${dream.id}`)}
          label="Yorumlar"
        />
        {/* Save */}
        <ActionBtn
          icon={localSaved ? '◆' : '◇'}
          count={localSaveCount}
          active={localSaved}
          activeColor="#FFB800"
          onClick={() => saveMut.mutate()}
          disabled={saveMut.isPending}
          label="Kaydet"
        />
        <div style={{ flex: 1 }} />
        {/* Share / open */}
        <button
          onClick={() => navigate(`/dream/${dream.id}`)}
          style={{
            background: 'none',
            border: '1px solid rgba(123,111,255,0.15)',
            borderRadius: 'var(--r-sm)',
            padding: '5px 12px',
            fontSize: 12,
            color: 'var(--text-3)',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.borderColor = 'rgba(123,111,255,0.35)';
            e.currentTarget.style.color = 'var(--primary)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.borderColor = 'rgba(123,111,255,0.15)';
            e.currentTarget.style.color = 'var(--text-3)';
          }}
        >
          Oku →
        </button>
      </div>
    </article>
  );
}

function ActionBtn({
  icon,
  count,
  active,
  activeColor,
  onClick,
  disabled,
  label,
}: {
  icon: string;
  count: number;
  active: boolean;
  activeColor: string;
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        background: 'none',
        border: 'none',
        padding: '5px 10px',
        borderRadius: 'var(--r-sm)',
        cursor: disabled ? 'default' : 'pointer',
        color: active ? activeColor : 'var(--text-3)',
        fontSize: 14,
        transition: 'color 0.15s, background 0.15s',
      }}
      onMouseOver={(e) => {
        if (!disabled) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.background = 'none';
      }}
    >
      <span style={{ transition: 'transform 0.15s' }}>{icon}</span>
      <span style={{ fontSize: 12, fontWeight: 500 }}>{count}</span>
    </button>
  );
}
