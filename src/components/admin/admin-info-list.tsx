import type { ReactNode } from "react";

/** Titled card wrapping a two-column definition list of {@link InfoRow}s. */
export function InfoSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-4 sm:p-5">
      <h3 className="text-sm font-medium">{title}</h3>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

/** Label/value pair rendered inside an {@link InfoSection}; `wide` spans both columns. */
export function InfoRow({
  label,
  value,
  wide,
}: {
  label: string;
  value: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium break-words">{value}</dd>
    </div>
  );
}
