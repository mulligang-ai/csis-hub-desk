import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAgent } from "@/lib/csis/auth";
import { ticketRef } from "@/lib/csis/constants";
import { btnCls, Card, inputCls, labelCls, PageHeader, StatusBadge, timeAgo } from "@/components/csis/ui";
import { updateCustomerAction } from "../../../actions";

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAgent();
  const { data: c } = await supabase.from("customers").select("*").eq("id", id).maybeSingle();
  if (!c) notFound();
  const { data: tickets } = await supabase
    .from("tickets")
    .select("id, number, subject, status, last_message_at")
    .eq("customer_id", id)
    .order("last_message_at", { ascending: false });
  return (
    <>
      <PageHeader title={c.name || c.email} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <form action={updateCustomerAction} className="space-y-3">
            <input type="hidden" name="id" value={c.id} />
            <p className="text-sm text-muted">{c.email}</p>
            <div><label className={labelCls} htmlFor="name">Name</label><input id="name" name="name" defaultValue={c.name} className={inputCls} /></div>
            <div><label className={labelCls} htmlFor="phone">Phone</label><input id="phone" name="phone" defaultValue={c.phone} className={inputCls} /></div>
            <div><label className={labelCls} htmlFor="company">Company</label><input id="company" name="company" defaultValue={c.company} className={inputCls} /></div>
            <div><label className={labelCls} htmlFor="notes">Notes</label><textarea id="notes" name="notes" rows={4} defaultValue={c.notes} className={inputCls} /></div>
            <button className={btnCls}>Save</button>
          </form>
        </Card>
        <Card className="p-0">
          <h2 className="px-5 pt-4 text-sm font-bold text-muted uppercase">Tickets</h2>
          <ul className="divide-y divide-line">
            {tickets?.map((t) => (
              <li key={t.id}>
                <Link href={`/desk/tickets/${t.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-mist">
                  <span className="min-w-0 truncate font-bold text-heading">
                    <span className="text-muted">{ticketRef(t.number)}</span> {t.subject}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <StatusBadge status={t.status} />
                    <span className="text-xs text-muted">{timeAgo(t.last_message_at)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
