import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAgent } from "@/lib/csis/auth";
import { PRIORITIES, STATUSES, TYPES, ticketRef } from "@/lib/csis/constants";
import { portalTicketUrl } from "@/lib/csis/tickets";
import type { Attachment, CannedResponse, Message, TicketEvent } from "@/lib/csis/types";
import {
  btnCls,
  btnGhostCls,
  Card,
  formatDate,
  inputCls,
  labelCls,
  PriorityBadge,
  StatusBadge,
} from "@/components/csis/ui";
import { replyAction, updateTicketAction } from "../../../actions";
import { CannedPicker } from "./canned-picker";

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireAgent();

  const { data: ticket } = await supabase
    .from("tickets")
    .select("*, customers(id, name, email, company)")
    .eq("id", id)
    .maybeSingle();
  if (!ticket) notFound();
  const customer = ticket.customers as { id: string; name: string; email: string; company: string };

  const [{ data: messages }, { data: attachments }, { data: events }, { data: agents }, { data: canned }] =
    await Promise.all([
      supabase.from("messages").select("*").eq("ticket_id", id).order("created_at"),
      supabase.from("attachments").select("*").eq("ticket_id", id),
      supabase.from("ticket_events").select("*").eq("ticket_id", id).order("created_at"),
      supabase.from("profiles").select("id, full_name, email").eq("active", true).order("full_name"),
      supabase.from("canned_responses").select("id, title, body").order("title"),
    ]);

  const names = new Map((agents ?? []).map((a) => [a.id, a.full_name || a.email]));
  const files = new Map<string, (Attachment & { url: string | null })[]>();
  for (const a of (attachments ?? []) as Attachment[]) {
    const { data: signed } = await supabase.storage
      .from("csis-attachments")
      .createSignedUrl(a.storage_path, 300);
    files.set(a.message_id, [...(files.get(a.message_id) ?? []), { ...a, url: signed?.signedUrl ?? null }]);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <section className="min-w-0">
        <div className="mb-4">
          <Link href="/desk/tickets" className="text-sm font-semibold text-brand">← Tickets</Link>
          <h1 className="mt-1 text-2xl">
            <span className="text-muted">{ticketRef(ticket.number)}</span> {ticket.subject}
          </h1>
          <div className="mt-2 flex gap-2">
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
          </div>
        </div>

        <div className="space-y-3">
          {(messages as Message[] | null)?.map((m) => (
            <Card
              key={m.id}
              className={
                m.kind === "note"
                  ? "border-amber-200 bg-amber-50"
                  : m.kind === "reply"
                    ? "border-brand-tint bg-brand-tint/40"
                    : ""
              }
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                <span className="font-bold text-heading">
                  {m.kind === "customer"
                    ? customer.name || customer.email
                    : (m.author_id && names.get(m.author_id)) || "Agent"}
                  {m.kind === "note" && <span className="ml-2 text-amber-700">Internal note</span>}
                </span>
                <span>{formatDate(m.created_at)}</span>
              </div>
              <p className="text-sm whitespace-pre-wrap text-ink">{m.body}</p>
              {files.get(m.id)?.map((f) => (
                <a
                  key={f.id}
                  href={f.url ?? "#"}
                  className="mt-2 mr-2 inline-block rounded-md border border-line bg-white px-2 py-1 text-xs font-semibold text-brand"
                >
                  📎 {f.filename} ({Math.ceil(f.size / 1024)} KB)
                </a>
              ))}
            </Card>
          ))}
        </div>

        <Card className="mt-6">
          <form action={replyAction} className="space-y-3">
            <input type="hidden" name="ticketId" value={ticket.id} />
            <CannedPicker canned={(canned ?? []) as CannedResponse[]} customerName={customer.name} />
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm font-semibold text-heading">
                <input type="radio" name="kind" value="reply" defaultChecked className="mr-1" />
                Reply to customer
              </label>
              <label className="text-sm font-semibold text-heading">
                <input type="radio" name="kind" value="note" className="mr-1" />
                Internal note
              </label>
            </div>
            <textarea id="reply-body" name="body" required rows={6} className={inputCls} placeholder="Write a message…" />
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm text-muted" htmlFor="reply-status">Then set status to</label>
              <select id="reply-status" name="status" defaultValue="waiting" className={`${inputCls} w-auto`}>
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <button className={btnCls}>Send</button>
            </div>
            <p className="text-xs text-muted">The status only applies to replies, not internal notes.</p>
          </form>
        </Card>

        {events && events.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-2 text-sm font-bold text-muted uppercase">Activity</h2>
            <ul className="space-y-1 text-xs text-muted">
              {(events as TicketEvent[]).map((e) => (
                <li key={e.id}>{formatDate(e.created_at)} — {e.description}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <aside className="space-y-4">
        <Card>
          <h2 className="mb-3 text-sm font-bold text-muted uppercase">Customer</h2>
          <Link href={`/desk/customers/${customer.id}`} className="font-bold text-brand">
            {customer.name || customer.email}
          </Link>
          <p className="text-sm text-muted">{customer.email}</p>
          {customer.company && <p className="text-sm text-muted">{customer.company}</p>}
          <p className="mt-3 text-xs break-all text-muted">
            Portal link: <a href={portalTicketUrl(ticket)} className="underline">open</a>
          </p>
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-bold text-muted uppercase">Properties</h2>
          <form action={updateTicketAction} className="space-y-3">
            <input type="hidden" name="ticketId" value={ticket.id} />
            <div>
              <label className={labelCls} htmlFor="p-status">Status</label>
              <select id="p-status" name="status" defaultValue={ticket.status} className={inputCls}>
                {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="p-priority">Priority</label>
              <select id="p-priority" name="priority" defaultValue={ticket.priority} className={inputCls}>
                {PRIORITIES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="p-type">Type</label>
              <select id="p-type" name="type" defaultValue={ticket.type} className={inputCls}>
                {TYPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="p-assignee">Assigned to</label>
              <select id="p-assignee" name="assignee" defaultValue={ticket.assignee_id ?? ""} className={inputCls}>
                <option value="">Unassigned</option>
                {agents?.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.full_name || a.email}{a.id === profile.id ? " (you)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="p-tags">Tags</label>
              <input id="p-tags" name="tags" defaultValue={ticket.tags.join(", ")} placeholder="billing, urgent" className={inputCls} />
            </div>
            <button className={`${btnGhostCls} w-full`}>Save changes</button>
          </form>
        </Card>
      </aside>
    </div>
  );
}
