"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body className="flex min-h-screen items-center justify-center bg-neutral-950 px-4 text-neutral-100">
        <div className="space-y-4 text-center">
          <h1 className="text-lg font-semibold">HobbyHoops</h1>
          <p className="text-sm text-neutral-400">Une erreur inattendue est survenue.</p>
          <button
            type="button"
            className="rounded-md border border-neutral-700 px-4 py-2 text-sm hover:bg-neutral-900"
            onClick={() => reset()}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
