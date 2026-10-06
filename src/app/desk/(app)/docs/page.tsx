import Link from "next/link";
import { requireAgent } from "@/lib/csis/auth";
import { Badge, btnCls, Card, PageHeader } from "@/components/csis/ui";

export default async function DocsAdmin() {
  const { supabase } = await requireAgent();
  const { data } = await supabase
    .from("articles")
    .select("id, title, category, published")
    .order("category")
    .order("title");
  return (
    <>
      <PageHeader title="Help docs">
        <Link href="/desk/docs/new" className={btnCls}>New article</Link>
      </PageHeader>
      <p className="mb-4 text-sm text-muted">
        Published articles appear on the public help centre at{" "}
        <Link href="/support/docs" className="font-bold text-brand">/support/docs</Link>.
      </p>
      <Card className="p-0">
        {data?.length ? (
          <ul className="divide-y divide-line">
            {data.map((a) => (
              <li key={a.id}>
                <Link href={`/desk/docs/${a.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-mist">
                  <span>
                    <span className="font-bold text-heading">{a.title}</span>
                    <span className="block text-xs text-muted">{a.category}</span>
                  </span>
                  <Badge tone={a.published ? "bg-emerald-50 text-emerald-700" : "bg-mist-deep text-muted"}>
                    {a.published ? "Published" : "Draft"}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-5 text-sm text-muted">No articles yet.</p>
        )}
      </Card>
    </>
  );
}
