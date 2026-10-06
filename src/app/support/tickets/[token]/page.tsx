import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/csis/supabase/admin";
import { statusMeta, ticketRef } from "@/lib/csis/constants";
import { btnCls, Card, formatDate, inputCls, Notice, StatusBadge } from "@/components/csis/ui";
import { customerReply } from "../../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your request", robots: { index: false, follow: false } };

export default async function PortalTicket({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const { token } = await params;
  const isNew = (await searchParams).new;
  const db = createAdminClient();
  const { data: ticket } = await db
    .from("tickets")
    .select("id, number, subject, status")
    .eq("access_token", token)
    .maybeSingle();
  if (!ticket) notFound();
  // Internal notes are never exposed here.
  const { data: messages } = await db
    .from("messages")
    .select("id, kind, body, created_at")
    .eq("ticket_id", ticket.id)
    .neq("kind", "note")
    .order("created_at");

  return (
    <main className="min-h-screen bg-mist">
      <div className="mx-auto max-w-2xl px-4 py-12">
        {isNew && (
          <Notice tone="info">
            Request received. Bookmark this page — it is your link to follow {ticketRef(ticket.number)}.
          </Notice>
        )}
        <p className="text-sm font-bold text-muted">{ticketRef(ticket.number)}</p>
        <h1 className="mt-1 text-2xl">{ticket.subject}</h1>
        <div className="mt-2" title={statusMeta(ticket.status).label}>
          <StatusBadge status={ticket.status} />
        </div>
        <div className="mt-6 space-y-3">
          {messages?.map((m) => (
            <Card key={m.id} className={m.kind === "reply" ? "border-brand-tint bg-brand-tint/40" : ""}>
              <div className="mb-1 flex justify-between text-xs text-muted">
                <span className="font-bold text-heading">{m.kind === "reply" ? "Support team" : "You"}</span>
                <span>{formatDate(m.created_at)}</span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{m.body}</p>
            </Card>
          ))}
        </div>
        <form action={customerReply} className="mt-6 space-y-3">
          <input type="hidden" name="token" value={token} />
          <textarea name="body" required rows={5} placeholder="Add a reply…" className={inputCls} />
          <button className={btnCls}>Send reply</button>
        </form>
      </div>
    </main>
  );
}
