interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  isPending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  title,
  message,
  confirmLabel = 'Onayla',
  danger = false,
  isPending = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="bg-dc-surface border border-dc-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <h2 className="text-dc-text font-bold text-base mb-2">{title}</h2>
        <p className="text-dc-secondary text-sm leading-relaxed mb-5">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="text-dc-muted hover:text-dc-text text-sm px-4 py-2 rounded-lg border border-dc-border transition-colors disabled:opacity-50"
          >
            İptal
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className={`text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${
              danger
                ? 'bg-dc-error hover:bg-dc-error/80 text-white'
                : 'bg-dc-primary hover:bg-dc-primary/80 text-white'
            }`}
          >
            {isPending ? 'İşleniyor...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
