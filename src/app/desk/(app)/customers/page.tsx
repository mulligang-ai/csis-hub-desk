import Link from "next/link";
import { requireAgent } from "@/lib/csis/auth";
import { btnCls, Card, inputCls, PageHeader } from "@/components/csis/ui";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const q = ((await searchParams).q ?? "").trim().replace(/[%_\\,()]/g, "");
  const { supabase } = await requireAgent();
  let query = supabase.from("customers").select("id, name, email, company").order("created_at", { ascending: false }).limit(100);
  if (q) query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,company.ilike.%${q}%`);
  const { data } = await query;
  return (
    <>
      <PageHeader title="Customers">
        <form className="flex gap-2">
          <input name="q" defaultValue={q} placeholder="Search customers" className={`${inputCls} w-64`} />
          <button className={btnCls}>Search</button>
        </form>
      </PageHeader>
      <Card className="p-0">
        {data?.length ? (
          <ul className="divide-y divide-line">
            {data.map((c) => (
              <li key={c.id}>
                <Link href={`/desk/customers/${c.id}`} className="block px-5 py-3 hover:bg-mist">
                  <span className="font-bold text-heading">{c.name || c.email}</span>
                  <span className="block text-xs text-muted">
                    {c.name && `${c.email} · `}{c.company}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-5 text-sm text-muted">No customers yet. They appear when someone emails or submits a ticket.</p>
        )}
      </Card>
    </>
  );
}
