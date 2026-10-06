import Link from "next/link";
import { requireAgent } from "@/lib/csis/auth";
import { STATUSES, ticketRef } from "@/lib/csis/constants";
import { Card, PageHeader, PriorityBadge, StatusBadge, timeAgo } from "@/components/csis/ui";

export default async function Dashboard() {
  const { supabase, profile } = await requireAgent();

  const counts = await Promise.all(
    STATUSES.map(async (s) => {
      const { count } = await supabase
        .from("tickets")
        .select("id", { count: "exact", head: true })
        .eq("status", s.value);
      return { ...s, count: count ?? 0 };
    }),
  );
  const { count: unassigned } = await supabase
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .eq("status", "active")
    .is("assignee_id", null);
  const { data: mine } = await supabase
    .from("tickets")
    .select("id, number, subject, priority, status, last_message_at, customers(name, email)")
    .eq("assignee_id", profile.id)
    .eq("status", "active")
    .order("last_message_at", { ascending: false })
    .limit(8);

  return (
    <>
      <PageHeader title={`Hello, ${profile.full_name.split(" ")[0] || "there"}`} />
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Link href="/desk/tickets?view=unassigned">
          <Card className="hover:border-brand">
            <p className="text-3xl font-extrabold text-coral-deep">{unassigned ?? 0}</p>
            <p className="text-sm text-muted">Unassigned &amp; active</p>
          </Card>
        </Link>
        {counts
          .filter((c) => ["active", "waiting", "on_hold"].includes(c.value))
          .map((c) => (
            <Link key={c.value} href={`/desk/tickets?view=${c.value}`}>
              <Card className="hover:border-brand">
                <p className="text-3xl font-extrabold text-brand">{c.count}</p>
                <p className="text-sm text-muted">{c.label}</p>
              </Card>
            </Link>
          ))}
      </div>

      <h2 className="mb-3 text-lg">Assigned to you</h2>
      <Card className="p-0">
        {mine?.length ? (
          <ul className="divide-y divide-line">
            {mine.map((t) => {
              const c = t.customers as unknown as { name: string; email: string };
              return (
                <li key={t.id}>
                  <Link
                    href={`/desk/tickets/${t.id}`}
                    className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-mist"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-bold text-heading">
                        <span className="text-muted">{ticketRef(t.number)}</span> {t.subject}
                      </span>
                      <span className="text-xs text-muted">{c.name || c.email}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <PriorityBadge priority={t.priority} />
                      <StatusBadge status={t.status} />
                      <span className="text-xs text-muted">{timeAgo(t.last_message_at)}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="p-5 text-sm text-muted">Nothing assigned to you right now.</p>
        )}
      </Card>
    </>
  );
}
