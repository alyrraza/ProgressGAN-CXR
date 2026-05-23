interface Props {
  message: string;
  onRetry?: () => void;
}

export default function ErrorCard({ message, onRetry }: Props) {
  return (
    <div className="card p-4 border-error/30 bg-error/5 flex items-start gap-3">
      <div className="text-error mt-0.5 shrink-0">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 3.75a.75.75 0 011.5 0v3.5a.75.75 0 01-1.5 0v-3.5zm.75 7a.875.875 0 110-1.75.875.875 0 010 1.75z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-error font-medium">Error</p>
        <p className="text-xs text-text-secondary mt-0.5 break-words">{message}</p>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary text-xs px-3 py-1.5 shrink-0">
          Retry
        </button>
      )}
    </div>
  );
}
