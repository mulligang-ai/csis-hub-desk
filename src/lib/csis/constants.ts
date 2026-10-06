import type { TicketPriority, TicketStatus, TicketType } from "./types";

export const PRODUCT_NAME = "CSIS Hub Desk";
export const COMPANY_NAME = process.env.NEXT_PUBLIC_COMPANY_NAME ?? "Agentic Ireland";
export const PRODUCT_SHORT = "CSIS";
export const TICKET_PREFIX = "CSIS";

export const STATUSES: { value: TicketStatus; label: string; tone: string }[] = [
  { value: "active", label: "Active", tone: "bg-brand-tint text-brand-deep" },
  { value: "waiting", label: "Waiting on customer", tone: "bg-lilac-tint text-lilac" },
  { value: "on_hold", label: "On hold", tone: "bg-coral-tint text-coral-deep" },
  { value: "solved", label: "Solved", tone: "bg-emerald-50 text-emerald-700" },
  { value: "closed", label: "Closed", tone: "bg-mist-deep text-muted" },
  { value: "spam", label: "Spam", tone: "bg-red-50 text-red-700" },
];

export const PRIORITIES: { value: TicketPriority; label: string; tone: string }[] = [
  { value: "low", label: "Low", tone: "bg-mist-deep text-muted" },
  { value: "normal", label: "Normal", tone: "bg-brand-tint text-brand-deep" },
  { value: "high", label: "High", tone: "bg-amber-50 text-amber-700" },
  { value: "urgent", label: "Urgent", tone: "bg-red-50 text-red-700" },
];

export const TYPES: { value: TicketType; label: string }[] = [
  { value: "question", label: "Question" },
  { value: "incident", label: "Incident" },
  { value: "problem", label: "Problem" },
  { value: "task", label: "Task" },
];

export const ticketRef = (n: number) => `${TICKET_PREFIX}-${n}`;
export const statusMeta = (s: string) => STATUSES.find((x) => x.value === s) ?? STATUSES[0];
export const priorityMeta = (p: string) => PRIORITIES.find((x) => x.value === p) ?? PRIORITIES[1];

export const siteUrl = () =>
  (process.env.NEXT_PUBLIC_SITE_URL ?? "https://agenticireland.ie").replace(/\/$/, "");
export const supportEmail = () => process.env.CSIS_SUPPORT_EMAIL ?? "support@agenticireland.ie";
