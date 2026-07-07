"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="max-w-md rounded-3xl border p-10 text-center">
            <h1 className="text-4xl font-bold">Something broke mid-flow.</h1>
            <p className="mt-4 text-sm text-gray-500">
              Refresh, or go home. If it keeps happening, ping your club admin.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-2">
              <button onClick={() => reset()} className="rounded-full bg-black px-4 py-2 text-sm text-white">
                Try again
              </button>
              <a href="/" className="rounded-full border px-4 py-2 text-sm">
                Go home
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
