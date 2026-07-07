import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass-strong max-w-md rounded-3xl p-10 text-center">
        <div className="text-mono-label mb-4">Error · 404</div>
        <h1 className="text-display text-6xl text-foreground">Lost in the sangam.</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          This page drifted downstream. Head back to the confluence.
        </p>
        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Return home →
          </Link>
        </div>
      </div>
    </div>
  );
}
