import type { Metadata } from "next";
import Link from "next/link";
import { createAdminClient } from "@/lib/csis/supabase/admin";

export const metadata: Metadata = { title: "Help docs", alternates: { canonical: "/support/docs" } };
export const dynamic = "force-dynamic";

export default async function HelpDocs() {
  const { data } = await createAdminClient()
    .from("articles")
    .select("title, slug, category")
    .eq("published", true)
    .order("category")
    .order("title");
  const groups = new Map<string, { title: string; slug: string }[]>();
  for (const a of data ?? []) groups.set(a.category, [...(groups.get(a.category) ?? []), a]);
  return (
    <main className="min-h-screen bg-mist">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Link href="/support" className="text-sm font-bold text-brand">← Support</Link>
        <h1 className="mt-1 mb-6 text-3xl">Help docs</h1>
        {groups.size === 0 && <p className="text-muted">No articles published yet.</p>}
        {[...groups].map(([cat, items]) => (
          <section key={cat} className="mb-6">
            <h2 className="mb-2 text-lg">{cat}</h2>
            <ul className="divide-y divide-line rounded-xl border border-line bg-white">
              {items.map((a) => (
                <li key={a.slug}>
                  <Link href={`/support/docs/${a.slug}`} className="block px-4 py-3 font-semibold text-heading hover:bg-mist">
                    {a.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
