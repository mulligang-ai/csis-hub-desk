import Link from "next/link";
import { requireAgent } from "@/lib/csis/auth";
import { TICKET_PREFIX, ticketRef } from "@/lib/csis/constants";
import {
  btnCls,
  Card,
  inputCls,
  PageHeader,
  PriorityBadge,
  StatusBadge,
  timeAgo,
} from "@/components/csis/ui";

const VIEWS: Record<string, string> = {
  mine: "My tickets",
  unassigned: "Unassigned",
  active: "Active",
  waiting: "Waiting on customer",
  on_hold: "On hold",
  solved: "Solved",
  closed: "Closed",
  spam: "Spam",
  all: "All tickets",
};

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | undefined }>;
}) {
  const sp = await searchParams;
  const view = sp.view && VIEWS[sp.view] ? sp.view : "active";
  const q = (sp.q ?? "").trim();
  const { supabase, profile } = await requireAgent();

  let query = supabase
    .from("tickets")
    .select(
      "id, number, subject, status, priority, tags, last_message_at, customers(name, email), assignee:profiles!assignee_id(full_name)",
    )
    .order("last_message_at", { ascending: false })
    .limit(100);

  if (view === "mine") query = query.eq("assignee_id", profile.id).in("status", ["active", "on_hold"]);
  else if (view === "unassigned") query = query.is("assignee_id", null).eq("status", "active");
  else if (view !== "all") query = query.eq("status", view);

  if (q) {
    const num = q.match(new RegExp(`^(?:${TICKET_PREFIX}-)?(\\d+)$`, "i"));
    if (num) query = query.eq("number", Number(num[1]));
    else query = query.ilike("subject", `%${q.replace(/[%_\\]/g, "\\$&")}%`);
  }
  const { data: tickets } = await query;

  return (
    <>
      <PageHeader title={VIEWS[view]}>
        <form className="flex gap-2">
          <input type="hidden" name="view" value={q ? "all" : view} />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search subject or CSIS-1234"
            className={`${inputCls} w-64`}
          />
          <button className={btnCls}>Search</button>
        </form>
      </PageHeader>
      <Card className="p-0">
        {tickets?.length ? (
          <ul className="divide-y divide-line">
            {tickets.map((t) => {
              const c = t.customers as unknown as { name: string; email: string };
              const a = t.assignee as unknown as { full_name: string } | null;
              return (
                <li key={t.id}>
                  <Link
                    href={`/desk/tickets/${t.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 hover:bg-mist"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold text-heading">
                        <span className="text-muted">{ticketRef(t.number)}</span> {t.subject}
                      </span>
                      <span className="text-xs text-muted">
                        {c.name || c.email} · {a ? a.full_name : "Unassigned"}
                        {t.tags.length > 0 && ` · ${t.tags.join(", ")}`}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <PriorityBadge priority={t.priority} />
                      <StatusBadge status={t.status} />
                      <span className="w-16 text-right text-xs text-muted">
                        {timeAgo(t.last_message_at)}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="p-5 text-sm text-muted">No tickets here.</p>
        )}
      </Card>
    </>
  );
}
