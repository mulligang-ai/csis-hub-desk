import type { ReactNode } from "react";
import { priorityMeta, statusMeta } from "@/lib/csis/constants";

export const inputCls =
  "w-full rounded-lg border border-line-strong bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand-tint";
export const btnCls =
  "inline-flex items-center justify-center rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-deep disabled:opacity-50";
export const btnGhostCls =
  "inline-flex items-center justify-center rounded-lg border border-line-strong bg-white px-3 py-1.5 text-sm font-semibold text-heading transition hover:bg-mist";
export const labelCls = "mb-1 block text-xs font-bold uppercase tracking-wide text-muted";

export function Badge({ children, tone }: { children: ReactNode; tone: string }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${tone}`}>
      {children}
    </span>
  );
}

export const StatusBadge = ({ status }: { status: string }) => {
  const m = statusMeta(status);
  return <Badge tone={m.tone}>{m.label}</Badge>;
};
export const PriorityBadge = ({ priority }: { priority: string }) => {
  const m = priorityMeta(priority);
  return <Badge tone={m.tone}>{m.label}</Badge>;
};

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl">{title}</h1>
      {children}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-line bg-white p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function Notice({ children, tone = "error" }: { children: ReactNode; tone?: "error" | "info" }) {
  return (
    <p
      className={`mb-4 rounded-lg px-3 py-2 text-sm font-semibold ${
        tone === "error" ? "bg-red-50 text-red-700" : "bg-brand-tint text-brand-deep"
      }`}
    >
      {children}
    </p>
  );
}

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("en-IE", { dateStyle: "medium", timeStyle: "short" });

export function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  const steps: [number, string][] = [[86400, "d"], [3600, "h"], [60, "m"]];
  for (const [n, u] of steps) if (s >= n) return `${Math.floor(s / n)}${u} ago`;
  return "just now";
}
