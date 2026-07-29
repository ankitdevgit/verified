import type { ReactNode } from "react";

/**
 * §9.4 — the empty and error states were written before the happy path. They
 * say what happened and what to do next, in the interface's voice. They do not
 * apologise and they are never vague.
 */
export function EmptyState({
  title,
  body,
  action,
  tone = "quiet",
}: {
  title: string;
  body?: string;
  action?: ReactNode;
  tone?: "quiet" | "alert";
}) {
  return (
    <div
      className={`rounded-card border border-dashed px-6 py-10 text-center ${
        tone === "alert" ? "border-alert/40 bg-alert-tint/40" : "border-rule bg-surface"
      }`}
    >
      <p
        className={`font-display text-lg ${tone === "alert" ? "text-alert" : "text-ink"}`}
      >
        {title}
      </p>
      {body && (
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">{body}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
