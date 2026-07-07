"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass-strong max-w-md rounded-3xl p-10 text-center">
        <div className="text-mono-label mb-4">Runtime error</div>
        <h1 className="text-display text-4xl">Something broke mid-flow.</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Refresh, or go home. If it keeps happening, ping your club admin.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => reset()}
            className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center rounded-full border border-hairline bg-surface px-4 py-2 text-sm font-medium transition hover:bg-surface-2"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
