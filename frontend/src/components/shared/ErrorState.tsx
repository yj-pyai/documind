"use client";

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="text-4xl mb-4">⚠️</div>
      <h3 className="text-lg font-medium text-[var(--foreground)] mb-2">Something went wrong</h3>
      <p className="text-sm text-[var(--muted)] mb-4 max-w-md">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm hover:opacity-90 transition-opacity"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
